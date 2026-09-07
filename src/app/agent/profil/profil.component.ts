import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserModel } from '../../shared/models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import {
  LucideUser,
  LucideMail,
  LucidePhone,
  LucideLock,
  LucideBuilding2,
  LucideCheck,
  LucideCopy,
  LucideEye,
  LucideEyeOff,
  LucideLoader2,
  LucideShieldCheck,
  LucideKey,
  LucideSave,
} from '@lucide/angular';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AlertComponent,
    LucideUser,
    LucideMail,
    LucidePhone,
    LucideLock,
    LucideBuilding2,
    LucideCheck,
    LucideCopy,
    LucideEye,
    LucideEyeOff,
    LucideLoader2,
    LucideShieldCheck,
    LucideKey,
    LucideSave,
  ],
  templateUrl: './profil.component.html',
})
export class ProfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  user: UserModel | null = null;
  loading = true;
  savingProfile = false;
  savingPassword = false;

  profileSuccess = '';
  profileError = '';
  passwordSuccess = '';
  passwordError = '';

  copiedMatricule = false;
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  profileForm = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
  });

  passwordForm = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(4)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.profileError = '';
    this.authService.getMe().subscribe({
      next: (data) => {
        // Handle unwrapped or wrapped format
        this.user = data?.data ? data.data : data;
        if (this.user) {
          this.profileForm.patchValue({
            firstName: this.user.firstName || '',
            lastName: this.user.lastName || '',
            email: this.user.email || '',
            phone: this.user.phone || '',
          });
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur lors du chargement du profil:', err);
        this.profileError = 'Impossible de charger les informations de votre profil.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile = true;
    this.profileSuccess = '';
    this.profileError = '';

    const payload = this.profileForm.value;

    this.authService.updateMe(payload).subscribe({
      next: (res) => {
        const updated = res?.data ? res.data : res;
        if (this.user) {
          this.user = {
            ...this.user,
            ...updated,
          };
        }
        this.profileSuccess = 'Vos informations personnelles ont été mises à jour avec succès !';
        this.savingProfile = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.profileSuccess = '';
          this.cdr.detectChanges();
        }, 5000);
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour du profil:', err);
        this.profileError =
          err?.error?.message ||
          err?.message ||
          'Une erreur est survenue lors de la mise à jour de vos informations.';
        this.savingProfile = false;
        this.cdr.detectChanges();
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { oldPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.passwordError = 'Le nouveau mot de passe et la confirmation ne correspondent pas.';
      return;
    }

    this.savingPassword = true;
    this.passwordSuccess = '';
    this.passwordError = '';

    this.authService.changePassword(oldPassword!, newPassword!).subscribe({
      next: (res) => {
        this.passwordSuccess =
          res?.message || res?.data?.message || 'Votre mot de passe a été modifié avec succès !';
        this.passwordForm.reset();
        this.savingPassword = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.passwordSuccess = '';
          this.cdr.detectChanges();
        }, 5000);
      },
      error: (err) => {
        console.error('Erreur lors de la modification du mot de passe:', err);
        this.passwordError =
          err?.error?.message ||
          err?.message ||
          'Ancien mot de passe incorrect ou erreur lors de la modification.';
        this.savingPassword = false;
        this.cdr.detectChanges();
      },
    });
  }

  copyMatricule(): void {
    if (!this.user?.matricule) return;
    navigator.clipboard.writeText(this.user.matricule).then(() => {
      this.copiedMatricule = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.copiedMatricule = false;
        this.cdr.detectChanges();
      }, 2000);
    });
  }

  get initials(): string {
    if (!this.user) return 'OA';
    const first = this.user.firstName ? this.user.firstName.charAt(0) : '';
    const last = this.user.lastName ? this.user.lastName.charAt(0) : '';
    const combined = (first + last).toUpperCase();
    if (combined) return combined;
    return (this.user.username || 'OA').slice(0, 2).toUpperCase();
  }

  getRoleLabel(role?: string): string {
    const r = role || this.user?.role || this.user?.type;
    if (!r) return 'Utilisateur OAS';

    const map: Record<string, string> = {
      ROLE_SUPER_AGENT: 'Super Agent',
      SUPER_AGENT: 'Super Agent',
      ROLE_MASTER: 'Master',
      MASTER: 'Master',
      ROLE_AGENT: 'Agent',
      AGENT: 'Agent',
      ROLE_CHEF_ATELIER: "Chef Atelier",
      CHEF_ATELIER: "Chef Atelier",
      ROLE_AGENT_MAGASIN: 'Agent Magasin',
      AGENT_MAGASIN: 'Agent Magasin',
      ROLE_TECHNICIEN: 'Technicien',
      TECHNICIEN: 'Technicien',
      ROLE_CLIENT: 'Client',
      CLIENT: 'Client',
    };

    return map[r] || r;
  }
}
