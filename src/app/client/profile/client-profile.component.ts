import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ClientPortalService } from '../layout/client-portal.service';
import { ClientProfileService } from './client-profile.service';
import { ClientMarketplaceService } from '../marketplace/client-marketplace.service';
import { DemandeProduit, StatutDemandeProduit } from '../models';
import { UserModel } from '../../shared/models/user.model';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { StatusBadgeComponent, BadgeTone } from '../ui/status-badge/status-badge.component';
import { CLIENT_PORTAL_PATHS } from '../client-portal.paths';

type CommandeFilter = 'TOUT' | 'EN_COURS' | 'ANNULE' | 'RECU';

const STATUT_LABELS: Record<StatutDemandeProduit, string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  COMMANDEE: 'Commandée',
  ANNULEE: 'Annulée',
  LIVREE: 'Livrée',
};

const STATUT_TONES: Record<StatutDemandeProduit, BadgeTone> = {
  EN_ATTENTE: 'pending',
  ACCEPTEE: 'info',
  REFUSEE: 'danger',
  COMMANDEE: 'info',
  ANNULEE: 'neutral',
  LIVREE: 'success',
};

const EN_COURS: StatutDemandeProduit[] = ['EN_ATTENTE', 'ACCEPTEE', 'COMMANDEE'];
const ANNULE: StatutDemandeProduit[] = ['ANNULEE', 'REFUSEE'];
const RECU: StatutDemandeProduit[] = ['LIVREE'];

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword ? { mismatch: true } : null;
}

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, AlertComponent, StatusBadgeComponent],
  templateUrl: './client-profile.component.html',
})
export class ClientProfileComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private portalService = inject(ClientPortalService);
  private profileService = inject(ClientProfileService);
  private marketplaceService = inject(ClientMarketplaceService);
  private fb = inject(FormBuilder);

  readonly paths = CLIENT_PORTAL_PATHS;
  readonly statutLabels = STATUT_LABELS;
  readonly statutTones = STATUT_TONES;

  user: UserModel | null = null;
  clientId: number | null = null;
  loading = false;

  // KPIs
  vehiculesCount = 0;

  // Actions profil
  savingProfile = false;
  profileSuccess = '';
  profileError = '';
  copiedMatricule = false;

  // Formulaire Infos personnelles
  profileForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [{ value: '', disabled: true }],
    email: [{ value: '', disabled: true }],
  });

  // Formulaire Mot de passe & Sécurité
  savingPassword = false;
  passwordSuccess = '';
  passwordError = '';
  showOldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  passwordForm: FormGroup = this.fb.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  // Commandes marketplace
  commandes: DemandeProduit[] = [];
  commandesFiltrees: DemandeProduit[] = [];
  commandesLoading = false;
  commandeFilter: CommandeFilter = 'TOUT';

  get initials(): string {
    if (!this.user) return 'CL';
    const f = (this.user.firstName || '').trim().charAt(0);
    const l = (this.user.lastName || '').trim().charAt(0);
    return (f + l).toUpperCase() || (this.user.username || 'CL').slice(0, 2).toUpperCase();
  }

  get passwordMismatch(): boolean {
    return this.passwordForm.hasError('mismatch') && !!this.passwordForm.get('confirmPassword')?.touched;
  }

  ngOnInit(): void {
    this.loading = true;

    // Charger les informations du client connecté
    this.portalService.getMe().subscribe({
      next: me => {
        this.user = me;
        this.clientId = me.id;
        this.profileForm.patchValue({
          firstName: me.firstName,
          lastName: me.lastName,
          phone: me.phone,
          email: me.email,
        });
        if (typeof me.vehiculeNumbers === 'number') {
          this.vehiculesCount = me.vehiculeNumbers;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.profileError = 'Impossible de charger votre profil.';
        this.cdr.markForCheck();
      },
    });

    this.loadCommandes();
  }

  copyMatricule(): void {
    const code = this.user?.matricule || this.user?.username || '';
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.copiedMatricule = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copiedMatricule = false;
        this.cdr.markForCheck();
      }, 2500);
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || !this.clientId) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile = true;
    this.profileError = '';
    this.profileSuccess = '';

    const payload = {
      firstName: this.profileForm.value.firstName,
      lastName: this.profileForm.value.lastName,
    };

    this.profileService.updateProfile(this.clientId, payload).subscribe({
      next: (res) => {
        this.savingProfile = false;
        this.portalService.clearMeCache();
        if (this.user) {
          this.user.firstName = res.firstName || payload.firstName;
          this.user.lastName = res.lastName || payload.lastName;
        }
        this.profileSuccess = 'Vos informations personnelles ont été mises à jour avec succès.';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.profileSuccess = '';
          this.cdr.markForCheck();
        }, 4000);
      },
      error: (err: any) => {
        this.savingProfile = false;
        this.profileError = err.error?.message || err.error || "Impossible d'enregistrer les modifications.";
        this.cdr.markForCheck();
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const username = this.user?.username;
    if (!username) {
      this.passwordError = 'Identifiant introuvable, veuillez recharger la page.';
      return;
    }

    this.savingPassword = true;
    this.passwordError = '';
    this.passwordSuccess = '';

    this.profileService.changePassword({
      username,
      oldPassword: this.passwordForm.value.oldPassword,
      newPassword: this.passwordForm.value.newPassword,
    }).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordSuccess = 'Votre mot de passe a été modifié avec succès.';
        this.passwordForm.reset();
        this.cdr.markForCheck();
        setTimeout(() => {
          this.passwordSuccess = '';
          this.cdr.markForCheck();
        }, 4000);
      },
      error: (err: any) => {
        this.savingPassword = false;
        this.passwordError = err.error?.message || err.error || "Impossible de changer le mot de passe. Vérifiez l'ancien mot de passe.";
        this.cdr.markForCheck();
      },
    });
  }

  loadCommandes(): void {
    this.commandesLoading = true;
    this.marketplaceService.getMesDemandes().subscribe({
      next: commandes => {
        this.commandes = commandes;
        this.applyCommandeFilter();
        this.commandesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.commandesLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  setCommandeFilter(filter: CommandeFilter): void {
    this.commandeFilter = filter;
    this.applyCommandeFilter();
  }

  private applyCommandeFilter(): void {
    const groupes: Record<CommandeFilter, StatutDemandeProduit[] | null> = {
      TOUT: null,
      EN_COURS,
      ANNULE,
      RECU,
    };
    const statuts = groupes[this.commandeFilter];
    this.commandesFiltrees = statuts ? this.commandes.filter(c => statuts.includes(c.statut)) : this.commandes;
  }

  annulerCommande(commande: DemandeProduit): void {
    if (!confirm('Confirmer l’annulation de cette commande ?')) return;
    this.marketplaceService.annulerDemande(commande.id).subscribe({
      next: () => this.loadCommandes(),
      error: (err: any) => {
        this.profileError = err.error?.message || "Impossible d'annuler cette commande.";
        this.cdr.markForCheck();
      },
    });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n ?? 0);
  }
}

