import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CLIENT_PORTAL_PATHS } from '../../client-portal.paths';
import { LucideEye, LucideEyeOff, LucideLoader2 } from '@lucide/angular';

@Component({
  selector: 'app-client-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LucideEye, LucideEyeOff, LucideLoader2],
  templateUrl: './client-register.component.html',
})
export class ClientRegisterComponent {
  readonly paths = CLIENT_PORTAL_PATHS;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  form: FormGroup = this.fb.group({
    phone: ['', Validators.required],
    login: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  showPassword = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // matricule laissé vide : généré automatiquement côté serveur pour un compte CLIENT
    const payload = { ...this.form.value, matricule: '', type: 'CLIENT' };

    this.authService.register(payload).subscribe({
      next: () => {
        this.successMessage = 'Compte créé avec succès ! Redirection vers la connexion...';
        setTimeout(() => this.router.navigate([CLIENT_PORTAL_PATHS.connexion]), 1500);
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Une erreur est survenue.';
      }
    });
  }

  f(name: string) { return this.form.get(name); }
}
