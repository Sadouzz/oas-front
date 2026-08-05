import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CLIENT_PORTAL_PATHS } from '../../client-portal.paths';
import { LucideUser, LucideLock, LucideEye, LucideEyeOff, LucideCheck, LucideLoader2 } from '@lucide/angular';

@Component({
  selector: 'app-client-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LucideUser, LucideLock, LucideEye, LucideEyeOff, LucideCheck, LucideLoader2],
  templateUrl: './client-login.component.html',
})
export class ClientLoginComponent {
  readonly paths = CLIENT_PORTAL_PATHS;

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  form: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  showPassword = false;
  loading = false;
  errorMessage = '';

  features = [
    'Prise de rendez-vous en ligne',
    'Suivi de vos devis et factures',
    'Historique de vos interventions',
    'Messagerie directe avec le garage',
  ];

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.form.value).subscribe({
      next: () => {
        if (!this.authService.hasRole('ROLE_CLIENT')) {
          this.loading = false;
          this.authService.logout();
          this.errorMessage = "Ce compte n'est pas un compte client.";
          return;
        }
        this.router.navigate([CLIENT_PORTAL_PATHS.tableauDeBord], { replaceUrl: true });
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || "Nom d'utilisateur ou mot de passe incorrect.";
      }
    });
  }

  get username() { return this.form.get('username'); }
  get password() { return this.form.get('password'); }
}
