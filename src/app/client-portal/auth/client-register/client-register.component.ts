import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CLIENT_PORTAL_PATHS } from '../../client-portal.paths';
import { LucideEye, LucideEyeOff, LucideLoader2, LucideCheck, LucideX } from '@lucide/angular';

type Step = 'type' | 'form';
type ClientType = 'PARTICULIER' | 'ENTREPRISE';
type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken';

@Component({
  selector: 'app-client-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LucideEye, LucideEyeOff, LucideLoader2, LucideCheck, LucideX],
  templateUrl: './client-register.component.html',
})
export class ClientRegisterComponent implements OnInit {
  readonly paths = CLIENT_PORTAL_PATHS;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  step: Step = 'type';
  clientType: ClientType | null = null;

  form: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: ['', Validators.required],
    login: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    raisonSociale: [''],
    numeroEntreprise: [''],
    emailEntreprise: ['', Validators.email],
    adresseEntreprise: [''],
  });

  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  usernameStatus: AvailabilityStatus = 'idle';
  usernameSuggestions: string[] = [];
  emailStatus: AvailabilityStatus = 'idle';

  ngOnInit(): void {
    this.form.get('login')!.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(value => {
        const username = (value ?? '').trim();
        if (!username) { this.usernameStatus = 'idle'; this.usernameSuggestions = []; return of(null); }
        this.usernameStatus = 'checking';
        return this.authService.checkUsername(username).pipe(catchError(() => of(null)));
      }),
    ).subscribe(res => {
      if (!res) { if (this.usernameStatus === 'checking') this.usernameStatus = 'idle'; return; }
      this.usernameStatus = res.available ? 'available' : 'taken';
      if (res.available) { this.usernameSuggestions = []; } else { this.buildSuggestions(this.form.get('login')!.value); }
    });

    this.form.get('email')!.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(value => {
        const email = (value ?? '').trim();
        if (!email || this.form.get('email')!.hasError('email')) { this.emailStatus = 'idle'; return of(null); }
        this.emailStatus = 'checking';
        return this.authService.checkEmail(email).pipe(catchError(() => of(null)));
      }),
    ).subscribe(res => {
      if (!res) { if (this.emailStatus === 'checking') this.emailStatus = 'idle'; return; }
      this.emailStatus = res.available ? 'available' : 'taken';
    });
  }

  /** Propose des variantes du login saisi, en ne gardant que celles réellement disponibles côté back. */
  private buildSuggestions(base: string): void {
    const clean = (base || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!clean) { this.usernameSuggestions = []; return; }
    const candidates = [`${clean}${Math.floor(Math.random() * 90 + 10)}`, `${clean}.oas`, `${clean}_${new Date().getFullYear()}`];
    this.usernameSuggestions = candidates;
    candidates.forEach(candidate => {
      this.authService.checkUsername(candidate).subscribe({
        next: res => {
          if (!res.available) {
            this.usernameSuggestions = this.usernameSuggestions.filter(c => c !== candidate);
          }
        },
        error: () => {},
      });
    });
  }

  applySuggestion(suggestion: string): void {
    this.form.get('login')!.setValue(suggestion);
  }

  choose(type: ClientType): void {
    this.clientType = type;
    this.step = 'form';

    const entrepriseControls = ['raisonSociale', 'numeroEntreprise', 'adresseEntreprise'];
    for (const name of entrepriseControls) {
      const ctrl = this.form.get(name)!;
      if (type === 'ENTREPRISE') {
        ctrl.setValidators(Validators.required);
      } else {
        ctrl.clearValidators();
      }
      ctrl.updateValueAndValidity();
    }
  }

  backToChoice(): void {
    this.step = 'type';
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.form.get('login')?.setErrors(null);
    this.form.get('email')?.setErrors(null);

    const raw = this.form.value;
    // matricule laissé vide : généré automatiquement côté serveur pour un compte CLIENT
    const payload = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      phone: raw.phone,
      login: raw.login,
      email: raw.email,
      password: raw.password,
      matricule: '',
      type: 'CLIENT',
      typeClient: this.clientType ?? 'PARTICULIER',
      ...(this.clientType === 'ENTREPRISE' ? {
        raisonSociale: raw.raisonSociale,
        numeroEntreprise: raw.numeroEntreprise,
        emailEntreprise: raw.emailEntreprise || null,
        adresseEntreprise: raw.adresseEntreprise,
      } : {}),
    };

    this.authService.register(payload as any).subscribe({
      next: () => {
        this.successMessage = 'Compte créé avec succès ! Redirection vers la connexion...';
        setTimeout(() => this.router.navigate([CLIENT_PORTAL_PATHS.connexion]), 1500);
      },
      error: (err: any) => {
        this.loading = false;
        const msg: string = err.error?.message || err.error || '';

        if (/username/i.test(msg)) {
          this.form.get('login')?.setErrors({ taken: true });
          this.form.get('login')?.markAsTouched();
        } else if (/email/i.test(msg)) {
          this.form.get('email')?.setErrors({ taken: true });
          this.form.get('email')?.markAsTouched();
        } else if (/phone/i.test(msg)) {
          this.form.get('phone')?.setErrors({ taken: true });
          this.form.get('phone')?.markAsTouched();
        } else {
          this.errorMessage = msg || 'Une erreur est survenue.';
        }
      }
    });
  }

  f(name: string) { return this.form.get(name); }
}
