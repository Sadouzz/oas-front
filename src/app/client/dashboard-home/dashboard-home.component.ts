import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClientDevisService } from '../devis/client-devis.service';
import { ClientProformaService } from '../proformas/client-proforma.service';
import { ClientRendezVousService } from '../rendezvous/client-rendezvous.service';
import { ClientFactureService } from '../factures/client-facture.service';
import { ClientVehiculeService } from '../vehicules/client-vehicule.service';
import { ClientInterventionService } from '../interventions/client-intervention.service';
import { Intervention } from '../models';
import { VehiculeModel } from '../../shared/models';
import { CLIENT_PORTAL_PATHS } from '../client-portal.paths';
import { StatusBadgeComponent } from '../ui/status-badge/status-badge.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';
import { ProgressStepperComponent } from '../ui/progress-stepper/progress-stepper.component';
import { interventionStage, interventionStageIndex, isActiveRepair, AUCUN_HISTORIQUE, STAGE_ORDER } from '../intervention-stage';

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
  private devisService = inject(ClientDevisService);
  private proformaService = inject(ClientProformaService);
  private rendezVousService = inject(ClientRendezVousService);
  private factureService = inject(ClientFactureService);
  private vehiculeService = inject(ClientVehiculeService);
  private interventionService = inject(ClientInterventionService);

  readonly paths = CLIENT_PORTAL_PATHS;

  get firstName(): string {
    return this.authService.getUsername() ?? '';
  }

  loadingStats = true;
  stats: StatCard[] = [];

  loadingVehicules = true;
  vehicules: VehiculeModel[] = [];
  interventions: Intervention[] = [];
  selected: VehiculeModel | null = null;

  ngOnInit(): void {
    this.loadStats();
    this.loadVehiculesEtInterventions();
  }

  private loadStats(): void {
    this.loadingStats = true;

    let devisEnAttente = 0;
    let proformasEnAttente = 0;
    let rdvAVenir = 0;
    let montantDu = 0;
    let remaining = 4;

    const done = () => {
      remaining -= 1;
      if (remaining === 0) {
        this.stats = [
          { label: 'Devis en attente', value: String(devisEnAttente), link: this.paths.devis, icon: ICON_DEVIS, iconBg: 'bg-oas-info-bg', iconColor: 'text-oas-info' },
          { label: 'Proformas en attente', value: String(proformasEnAttente), link: this.paths.proformas, icon: ICON_PROFORMA, iconBg: 'bg-oas-warn-bg', iconColor: 'text-oas-warn' },
          { label: 'Rendez-vous à venir', value: String(rdvAVenir), link: this.paths.rendezVous, icon: ICON_RDV, iconBg: 'bg-oas-accent-bg', iconColor: 'text-oas-accent' },
          { label: 'Montant dû', value: `${montantDu.toLocaleString('fr-FR')} F`, link: this.paths.factures, icon: ICON_FACTURE, iconBg: 'bg-oas-bad-bg', iconColor: 'text-oas-bad' },
        ];
        this.loadingStats = false;
      }
    };

    this.devisService.getAll().subscribe({
      next: devis => { devisEnAttente = devis.filter(d => d.statut === 'EN_ATTENTE').length; done(); },
      error: () => done(),
    });

    this.proformaService.getAll().subscribe({
      next: proformas => { proformasEnAttente = proformas.filter(p => !p.statut || p.statut === 'EN_ATTENTE').length; done(); },
      error: () => done(),
    });

    this.rendezVousService.getAll().subscribe({
      next: rdv => { rdvAVenir = rdv.filter(r => r.statut === 'EN_ATTENTE' || r.statut === 'CONFIRME').length; done(); },
      error: () => done(),
    });

    this.factureService.getAll().subscribe({
      next: factures => { montantDu = factures.reduce((sum, f) => sum + f.resteAPayer, 0); done(); },
      error: () => done(),
    });
  }

  private loadVehiculesEtInterventions(): void {
    this.loadingVehicules = true;
    let remaining = 2;
    const done = () => {
      remaining -= 1;
      if (remaining === 0) this.loadingVehicules = false;
    };

    this.vehiculeService.getAll().subscribe({
      next: vehicules => { this.vehicules = vehicules; done(); },
      error: () => done(),
    });

    this.interventionService.getAll().subscribe({
      next: interventions => { this.interventions = interventions; done(); },
      error: () => done(),
    });
  }

  private interventionsFor(vehiculeId: number): Intervention[] {
    return this.interventions
      .filter(i => i.vehicule?.id === vehiculeId)
      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
  }

  readonly stageOrder = STAGE_ORDER;

  vehiculeStage(vehicule: VehiculeModel) {
    const derniere = this.interventionsFor(vehicule.id)[0];
    return derniere ? interventionStage(derniere.statut) : AUCUN_HISTORIQUE;
  }

  vehiculeStageIndex(vehicule: VehiculeModel): number {
    const derniere = this.interventionsFor(vehicule.id)[0];
    return derniere ? interventionStageIndex(derniere.statut) : -1;
  }

  historiqueFor(vehicule: VehiculeModel): Intervention[] {
    return this.interventionsFor(vehicule.id);
  }

  get activeRepairs(): { vehicule: VehiculeModel | undefined; intervention: Intervention }[] {
    return this.interventions
      .filter(i => isActiveRepair(i.statut))
      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
      .slice(0, 5)
      .map(intervention => ({
        intervention,
        vehicule: this.vehicules.find(v => v.id === intervention.vehicule?.id),
      }));
  }

  stageOf(statut: string) {
    return interventionStage(statut);
  }

  select(vehicule: VehiculeModel): void {
    this.selected = vehicule;
  }

  closeDetail(): void {
    this.selected = null;
  }
}
