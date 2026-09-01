import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientPortalService } from '../services/client-portal.service';
import { ClientProfileService } from '../services/client-profile.service';
import { ClientMarketplaceService } from '../services/client-marketplace.service';
import { DemandeProduit, StatutDemandeProduit } from '../models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { StatusBadgeComponent, BadgeTone } from '../ui/status-badge/status-badge.component';

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

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent, StatusBadgeComponent],
  templateUrl: './client-profile.component.html',
})
export class ClientProfileComponent implements OnInit {
  private portalService = inject(ClientPortalService);
  private profileService = inject(ClientProfileService);
  private marketplaceService = inject(ClientMarketplaceService);
  private fb = inject(FormBuilder);

  private clientId: number | null = null;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  readonly statutLabels = STATUT_LABELS;
  readonly statutTones = STATUT_TONES;

  commandes: DemandeProduit[] = [];
  commandesFiltrees: DemandeProduit[] = [];
  commandesLoading = false;
  commandeFilter: CommandeFilter = 'TOUT';

  form: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    // Téléphone et email servent d'identifiants de connexion / de contact vérifiés :
    // non modifiables depuis le profil, affichés à titre indicatif uniquement.
    phone: [{ value: '', disabled: true }],
    email: [{ value: '', disabled: true }],
  });

  ngOnInit(): void {
    this.loading = true;
    this.portalService.getMe().subscribe({
      next: me => {
        this.clientId = me.id;
        this.form.patchValue({
          firstName: me.firstName,
          lastName: me.lastName,
          phone: me.phone,
          email: me.email,
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger votre profil.';
      },
    });

    this.loadCommandes();
  }

  loadCommandes(): void {
    this.commandesLoading = true;
    this.marketplaceService.getMesDemandes().subscribe({
      next: commandes => {
        this.commandes = commandes;
        this.applyCommandeFilter();
        this.commandesLoading = false;
      },
      error: () => { this.commandesLoading = false; },
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
      error: (err: any) => this.errorMessage = err.error?.message || "Impossible d'annuler cette commande.",
    });
  }

  fmt(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n ?? 0);
  }

  save(): void {
    if (this.form.invalid || !this.clientId) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.updateProfile(this.clientId, this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Profil mis à jour avec succès.';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || err.error || "Impossible de mettre à jour le profil.";
      },
    });
  }
}
