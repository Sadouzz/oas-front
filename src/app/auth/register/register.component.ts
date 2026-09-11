import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideEye, LucideEyeOff, LucideLoader2, LucideCheck } from '@lucide/angular';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LucideEye, LucideEyeOff, LucideLoader2, LucideCheck],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  form: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    login: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  features = [
    'Prise de rendez-vous en ligne en 1 clic',
    'Suivi en temps réel de vos réparations',
    'Historique complet de vos véhicules et factures',
  ];

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const raw = this.form.value;
    const payload = {
      login: raw.login.trim(),
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      phone: raw.phone.trim(),
      email: raw.email.trim(),
      password: raw.password,
      type: 'CLIENT',
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.successMessage = 'Compte client créé avec succès ! Redirection vers la connexion...';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.errorMessage = err.error?.message || 'Une erreur est survenue lors de la création de votre compte.';
      }
    });
  }

  f(name: string) { return this.form.get(name); }
}
