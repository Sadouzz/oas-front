import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ClientProfileService } from '../services/client-profile.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
}

@Component({
  selector: 'app-client-settings',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './client-settings.component.html',
})
export class ClientSettingsComponent {
  private authService = inject(AuthService);
  private profileService = inject(ClientProfileService);
  private fb = inject(FormBuilder);

  saving = false;
  successMessage = '';
  errorMessage = '';

  form: FormGroup = this.fb.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  get mismatch(): boolean {
    return this.form.hasError('mismatch') && !!this.form.get('confirmPassword')?.touched;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const username = this.authService.getUsername();
    if (!username) {
      this.errorMessage = 'Session invalide, veuillez vous reconnecter.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.changePassword({
      username,
      oldPassword: this.form.value.oldPassword,
      newPassword: this.form.value.newPassword,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Mot de passe changé avec succès.';
        this.form.reset();
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || err.error || "Impossible de changer le mot de passe.";
      },
    });
  }
}
