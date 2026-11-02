import { Component, inject, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserModel } from '../../shared/models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PhoneInputComponent } from '../../shared/components/phone-input/phone-input.component';
import { AgentSignatureService } from '../fiches-atelier/agent-signature.service';
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
    PhoneInputComponent
  ],
  templateUrl: './profil.component.html',
})
export class ProfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private agentSignatureService = inject(AgentSignatureService);

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
  signatureConfigured = false;
  signatureSaving = false;
  signatureMessage = '';
  signatureError = '';
  private signatureContext: CanvasRenderingContext2D | null = null;
  private signatureDrawing = false;
  private signatureHasInk = false;
  private agentSignatureCanvasEl?: HTMLCanvasElement;

  @ViewChild('agentSignatureCanvas') set agentSignatureCanvas(element: ElementRef<HTMLCanvasElement> | undefined) {
    if (!element) return;
    this.agentSignatureCanvasEl = element.nativeElement;
    this.signatureContext = element.nativeElement.getContext('2d');
    if (this.signatureContext) {
      this.signatureContext.lineWidth = 2;
      this.signatureContext.lineCap = 'round';
      this.signatureContext.strokeStyle = '#000000';
    }
  }

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
        if (this.user?.type === 'AGENT') this.loadAgentSignature();
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

  private loadAgentSignature(): void {
    this.agentSignatureService.getMine().subscribe({
      next: result => {
        this.signatureConfigured = result.configured;
        if (result.signatureBase64 && this.agentSignatureCanvasEl && this.signatureContext) {
          const image = new Image();
          image.onload = () => {
            const canvas = this.agentSignatureCanvasEl;
            if (canvas) this.signatureContext?.drawImage(image, 0, 0, canvas.width, canvas.height);
            this.signatureHasInk = true;
            this.cdr.markForCheck();
          };
          image.src = result.signatureBase64;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.signatureError = 'Impossible de charger votre signature enregistrée.'; this.cdr.markForCheck(); }
    });
  }

  startAgentSignature(event: PointerEvent): void {
    const canvas = event.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.signatureContext?.beginPath();
    this.signatureContext?.moveTo((event.clientX - rect.left) * canvas.width / rect.width, (event.clientY - rect.top) * canvas.height / rect.height);
    this.signatureDrawing = true;
    canvas.setPointerCapture(event.pointerId);
  }

  drawAgentSignature(event: PointerEvent): void {
    if (!this.signatureDrawing || !this.signatureContext) return;
    const canvas = event.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.signatureContext.lineTo((event.clientX - rect.left) * canvas.width / rect.width, (event.clientY - rect.top) * canvas.height / rect.height);
    this.signatureContext.stroke();
    this.signatureHasInk = true;
  }

  stopAgentSignature(): void { this.signatureDrawing = false; this.signatureContext?.beginPath(); }

  clearAgentSignatureCanvas(): void {
    const canvas = this.agentSignatureCanvasEl;
    if (canvas) this.signatureContext?.clearRect(0, 0, canvas.width, canvas.height);
    this.signatureHasInk = false;
    this.signatureMessage = '';
    this.signatureError = '';
  }

  saveAgentSignature(): void {
    const canvas = this.agentSignatureCanvasEl;
    if (!canvas || !this.signatureHasInk) { this.signatureError = 'Veuillez dessiner votre signature avant de l’enregistrer.'; return; }
    this.signatureSaving = true; this.signatureError = ''; this.signatureMessage = '';
    this.agentSignatureService.saveMine(canvas.toDataURL('image/png')).subscribe({
      next: () => { this.signatureConfigured = true; this.signatureSaving = false; this.signatureMessage = 'Votre signature est enregistrée de manière chiffrée.'; this.cdr.markForCheck(); },
      error: err => { this.signatureSaving = false; this.signatureError = err?.error?.message || 'Impossible d’enregistrer votre signature.'; this.cdr.markForCheck(); }
    });
  }

  deleteAgentSignature(): void {
    this.signatureSaving = true; this.signatureError = ''; this.signatureMessage = '';
    this.agentSignatureService.deleteMine().subscribe({
      next: () => { this.signatureConfigured = false; this.signatureSaving = false; this.clearAgentSignatureCanvas(); this.signatureMessage = 'Votre signature enregistrée a été supprimée.'; this.cdr.markForCheck(); },
      error: err => { this.signatureSaving = false; this.signatureError = err?.error?.message || 'Impossible de supprimer votre signature.'; this.cdr.markForCheck(); }
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
