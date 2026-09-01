import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError, firstValueFrom } from 'rxjs';
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
  private cdr = inject(ChangeDetectorRef);
  readonly paths = CLIENT_PORTAL_PATHS;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  step: Step = 'type';
  clientType: ClientType | null = null;

  form: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    // Champs "particulier"
    phone: [''],
    email: [''],
    // Champs "entreprise" — seul contact utilisé pour le compte dans ce cas (pas de contact
    // personnel du responsable, cf. consigne : uniquement le mail et le téléphone de l'entreprise).
    raisonSociale: [''],
    numeroEntreprise: [''],
    emailEntreprise: [''],
    telephoneEntreprise: [''],
    adresseEntreprise: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  emailStatus: AvailabilityStatus = 'idle';

  ngOnInit(): void {
    // Vérification de dispo en temps réel, quel que soit le champ email actif (particulier ou entreprise).
    this.wireEmailAvailabilityCheck('email');
    this.wireEmailAvailabilityCheck('emailEntreprise');
  }

  private wireEmailAvailabilityCheck(controlName: string): void {
    this.form.get(controlName)!.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(value => {
        const email = (value ?? '').trim();
        const ctrl = this.form.get(controlName)!;
        if (!email || ctrl.hasError('email')) { this.emailStatus = 'idle'; return of(null); }
        this.emailStatus = 'checking';
        return this.authService.checkEmail(email).pipe(catchError(() => of(null)));
      }),
    ).subscribe(res => {
      if (!res) { if (this.emailStatus === 'checking') this.emailStatus = 'idle'; return; }
      this.emailStatus = res.available ? 'available' : 'taken';
    });
  }

  choose(type: ClientType): void {
    this.clientType = type;
    this.step = 'form';

    const particulierControls = ['phone', 'email'];
    const entrepriseControls = ['raisonSociale', 'numeroEntreprise', 'emailEntreprise', 'telephoneEntreprise', 'adresseEntreprise'];

    const applyRequired = (names: string[], required: boolean) => {
      for (const name of names) {
        const ctrl = this.form.get(name)!;
        if (required) {
          ctrl.setValidators(name.toLowerCase().includes('email') ? [Validators.required, Validators.email] : Validators.required);
        } else {
          ctrl.clearValidators();
          ctrl.setValue('');
        }
        ctrl.updateValueAndValidity();
      }
    };

    applyRequired(particulierControls, type === 'PARTICULIER');
    applyRequired(entrepriseControls, type === 'ENTREPRISE');
  }

  backToChoice(): void {
    this.step = 'type';
    this.errorMessage = '';
  }

  /**
   * Aucun login visible côté client : on génère un identifiant technique en interne
   * (à partir du nom/de la raison sociale) et on vérifie sa disponibilité avant de l'utiliser.
   */
  private async resolveAvailableUsername(): Promise<string> {
    const raw = this.form.value;
    const base = (this.clientType === 'ENTREPRISE' ? raw.raisonSociale : `${raw.firstName}${raw.lastName}`) || 'client';
    const clean = base.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '') || 'client';

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${clean}${Math.floor(Math.random() * 9000 + 1000)}`;
      try {
        const res = await firstValueFrom(this.authService.checkUsername(candidate));
        if (res.available) return candidate;
      } catch {
        // en cas d'erreur réseau sur la vérification, on tente quand même ce candidat
        return candidate;
      }
    }
    return `${clean}${Date.now()}`;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.form.get('email')?.setErrors(null);
    this.form.get('emailEntreprise')?.setErrors(null);
    this.form.get('phone')?.setErrors(null);
    this.form.get('telephoneEntreprise')?.setErrors(null);

    const raw = this.form.value;
    const isEntreprise = this.clientType === 'ENTREPRISE';
    const login = await this.resolveAvailableUsername();

    // matricule laissé vide : généré automatiquement côté serveur pour un compte CLIENT
    const payload = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      phone: isEntreprise ? raw.telephoneEntreprise : raw.phone,
      login,
      email: isEntreprise ? raw.emailEntreprise : raw.email,
      password: raw.password,
      matricule: '',
      type: 'CLIENT',
      typeClient: this.clientType ?? 'PARTICULIER',
      ...(isEntreprise ? {
        raisonSociale: raw.raisonSociale,
        numeroEntreprise: raw.numeroEntreprise,
        emailEntreprise: raw.emailEntreprise,
        adresseEntreprise: raw.adresseEntreprise,
      } : {}),
    };

    this.authService.register(payload as any).subscribe({
      next: () => {
        this.successMessage = 'Compte créé avec succès ! Redirection vers la connexion...';
        setTimeout(() => this.router.navigate([CLIENT_PORTAL_PATHS.connexion]), 1500);
      },
      error: (err: any) => {
        this.loading = false; this.cdr.markForCheck();
        const msg: string = err.error?.message || err.error || '';

        if (/username/i.test(msg)) {
          this.errorMessage = "Une erreur technique est survenue, veuillez réessayer.";
        } else if (/email/i.test(msg)) {
          const ctrlName = isEntreprise ? 'emailEntreprise' : 'email';
          this.form.get(ctrlName)?.setErrors({ taken: true });
          this.form.get(ctrlName)?.markAsTouched();
        } else if (/phone/i.test(msg)) {
          const ctrlName = isEntreprise ? 'telephoneEntreprise' : 'phone';
          this.form.get(ctrlName)?.setErrors({ taken: true });
          this.form.get(ctrlName)?.markAsTouched();
        } else {
          this.errorMessage = msg || 'Une erreur est survenue.';
        }
      }
    });
  }

  f(name: string) { return this.form.get(name); }
}
