import { Component, inject, ChangeDetectorRef, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { form, required, minLength, submit, FormField } from '@angular/forms/signals';
import { LucideUser, LucideLock, LucideEye, LucideEyeOff, LucideCheck, LucideLoader2 } from '@lucide/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormField, LucideUser, LucideLock, LucideEye, LucideEyeOff, LucideCheck, LucideLoader2],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly loginModel = signal({
    username: '',
    password: '',
  });

  readonly loginForm = form(this.loginModel, (schemaPath) => {
    required(schemaPath.username, { message: 'Le nom d\'utilisateur est obligatoire' });
    required(schemaPath.password, { message: 'Le mot de passe est obligatoire' });
    minLength(schemaPath.password, 4, { message: 'Le mot de passe doit contenir au moins 4 caractères' });
  });

  showPassword = false;
  errorMessage = '';

  features = [
    'Suivi des interventions en temps réel',
    'Gestion du stock et des pièces',
    'Facturation automatisée avec TVA',
    'Accès multi-rôles sécurisé',
  ];

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    await submit(this.loginForm, {
      action: async () => {
        this.errorMessage = '';
        this.cdr.markForCheck();

        try {
          const response: any = await firstValueFrom(
            this.authService.login(this.loginModel())
          );

          const role = response?.role || this.authService.getRole();
          let target = '/agent/dashboard';

          if (role === 'ROLE_CLIENT') {
            target = '/client';
          } else if (role === 'ROLE_TECHNICIEN') {
            target = '/technicien';
          }

          console.log('Login success. Role:', role, '-> Navigating to:', target);
          await this.router.navigateByUrl(target);
        } catch (err: any) {
          console.error('Login error:', err);
          this.errorMessage = err.error?.message || "Nom d'utilisateur ou mot de passe incorrect.";
          this.cdr.markForCheck();
        }
      },
      onInvalid: () => {
        this.errorMessage = 'Veuillez corriger les champs du formulaire.';
        this.cdr.markForCheck();
      }
    });
  }
}
