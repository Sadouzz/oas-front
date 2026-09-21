import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClientPortalService } from '../layout/client-portal.service';
import { ClientDashboardVehicule, ClientInterventionSummary } from '../models';
import { CLIENT_PORTAL_PATHS } from '../client-portal.paths';
import { StatusBadgeComponent, BadgeTone } from '../ui/status-badge/status-badge.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';
import { ProgressStepperComponent } from '../ui/progress-stepper/progress-stepper.component';
import { interventionStage, STAGE_ORDER } from '../intervention-stage';

interface StatCard {
  label: string;
  value: string;
  link: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

const ICON_DEVIS = 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z';
const ICON_PROFORMA = 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
const ICON_RDV = 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
const ICON_FACTURE = 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusBadgeComponent, VehicleAvatarComponent, ProgressStepperComponent],
  templateUrl: './dashboard-home.component.html',
})
export class DashboardHomeComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private portalService = inject(ClientPortalService);

  readonly paths = CLIENT_PORTAL_PATHS;
  readonly stageOrder = STAGE_ORDER;

  get firstName(): string {
    return this.authService.getUsername() ?? '';
  }

  loadingStats = true;
  loadingVehicules = true;
  stats: StatCard[] = [];
  vehicules: ClientDashboardVehicule[] = [];
  selected: ClientDashboardVehicule | null = null;
  selectedHistorique: ClientInterventionSummary[] = [];

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loadingStats = true;
    this.loadingVehicules = true;

    this.portalService.getDashboard().subscribe({
      next: data => {
        const s = data.stats;
        this.stats = [
          { label: 'Devis en attente', value: String(s.devisEnAttente ?? 0), link: this.paths.devis, icon: ICON_DEVIS, iconBg: 'bg-oas-info-bg', iconColor: 'text-oas-info' },
          { label: 'Proformas en attente', value: String(s.proformasEnAttente ?? 0), link: this.paths.proformas, icon: ICON_PROFORMA, iconBg: 'bg-oas-warn-bg', iconColor: 'text-oas-warn' },
          { label: 'Rendez-vous à venir', value: String(s.rdvAVenir ?? 0), link: this.paths.rendezVous, icon: ICON_RDV, iconBg: 'bg-oas-accent-bg', iconColor: 'text-oas-accent' },
          { label: 'Montant dû', value: `${(s.montantDu ?? 0).toLocaleString('fr-FR')} F`, link: this.paths.factures, icon: ICON_FACTURE, iconBg: 'bg-oas-bad-bg', iconColor: 'text-oas-bad' },
        ];
        this.loadingStats = false;

        this.vehicules = data.vehicules ?? [];
        this.loadingVehicules = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingStats = false;
        this.loadingVehicules = false;
        this.cdr.markForCheck();
      }
    });
  }

  vehiculeStage(vehicule: ClientDashboardVehicule): { label: string; tone: BadgeTone } {
    return {
      label: vehicule.stageLabel || 'Aucun historique',
      tone: (vehicule.stageTone as BadgeTone) || 'neutral'
    };
  }

  vehiculeStageIndex(vehicule: ClientDashboardVehicule): number {
    return vehicule.stageIndex ?? -1;
  }

  historiqueFor(_vehicule: ClientDashboardVehicule): ClientInterventionSummary[] {
    return this.selectedHistorique;
  }

  get activeRepairs(): { vehicule: ClientDashboardVehicule; intervention: { id: number; numero: string; statut: string } }[] {
    return this.vehicules
      .filter(v => v.stageIndex >= 0 && v.stageIndex < 4 && !!v.ordreReparationId)
      .slice(0, 5)
      .map(v => ({
        vehicule: v,
        intervention: {
          id: v.ordreReparationId!,
          numero: v.ordreReparationNumero || '',
          statut: v.stage
        }
      }));
  }

  stageOf(statut: string): { label: string; tone: BadgeTone } {
    return interventionStage(statut);
  }

  select(vehicule: ClientDashboardVehicule): void {
    this.selected = vehicule;
    this.selectedHistorique = [];
    this.portalService.getVehiculeHistorique(vehicule.id).subscribe({
      next: h => {
        this.selectedHistorique = h;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedHistorique = [];
        this.cdr.markForCheck();
      }
    });
  }

  closeDetail(): void {
    this.selected = null;
    this.selectedHistorique = [];
  }
}
