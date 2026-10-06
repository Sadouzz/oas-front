import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideEye, LucideEyeOff, LucideLoader2, LucideCheck } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';

import { PhoneInputComponent } from '../../shared/components/phone-input/phone-input.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LucideEye, LucideEyeOff, LucideLoader2, LucideCheck, PhoneInputComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  form: FormGroup = this.fb.group({
    typeClient: ['PARTICULIER', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    raisonSociale: [''],
    numeroEntreprise: [''],
    emailEntreprise: [''],
    telephoneEntreprise: [''],
    adresseEntreprise: [''],
    // login: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  features = [
    'Prise de rendez-vous en ligne en 1 clic',
    'Suivi en temps réel de vos réparations',
    'Historique complet de vos véhicules et factures',
  ];

  chooseClientType(type: 'PARTICULIER' | 'ENTREPRISE'): void {
    this.form.patchValue({ typeClient: type });
    const personalContactFields = ['phone', 'email'];
    const enterpriseFields = ['raisonSociale', 'numeroEntreprise', 'emailEntreprise', 'telephoneEntreprise', 'adresseEntreprise'];
    for (const name of personalContactFields) {
      const control = this.form.get(name)!;
      if (type === 'PARTICULIER') {
        control.setValidators(name === 'email' ? [Validators.required, Validators.email] : Validators.required);
      } else {
        control.clearValidators();
        control.setValue('');
      }
      control.updateValueAndValidity();
    }
    for (const name of enterpriseFields) {
      const control = this.form.get(name)!;
      if (type === 'ENTREPRISE') {
        control.setValidators(name === 'emailEntreprise' ? [Validators.required, Validators.email] : Validators.required);
      } else {
        control.clearValidators();
        control.setValue('');
      }
      control.updateValueAndValidity();
    }
  }

  private async resolveAvailableUsername(base: string): Promise<string> {
    const clean = base.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') || 'client';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${clean}${Math.floor(Math.random() * 9000 + 1000)}`;
      try {
        if ((await firstValueFrom(this.authService.checkUsername(candidate))).available) return candidate;
      } catch {
        return `${clean}${Date.now()}`;
      }
    }
    return `${clean}${Date.now()}`;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.hasError('mismatch')) {
        this.errorMessage = 'Le mot de passe et la confirmation ne correspondent pas.';
      }
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const raw = this.form.value;
    const isEnterprise = raw.typeClient === 'ENTREPRISE';
    const email = isEnterprise ? raw.emailEntreprise.trim() : raw.email.trim();
    const phone = isEnterprise ? raw.telephoneEntreprise.trim() : raw.phone.trim();
    const loginBase = isEnterprise ? raw.raisonSociale : `${raw.firstName}${raw.lastName}`;
    const login = await this.resolveAvailableUsername(loginBase);

    const payload = {
      login,
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      phone,
      email,
      password: raw.password,
      confirmPassword: raw.confirmPassword,
      type: 'CLIENT',
      typeClient: raw.typeClient,
      ...(isEnterprise ? {
        raisonSociale: raw.raisonSociale.trim(),
        numeroEntreprise: raw.numeroEntreprise.trim(),
        emailEntreprise: email,
        telephoneEntreprise: phone,
        adresseEntreprise: raw.adresseEntreprise.trim(),
      } : {}),
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
