import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideUsers, LucideCar, LucideAlertTriangle, LucideClock, LucidePackage, LucideArrowRight, LucideCheckCircle, LucideBuilding, LucideCalendar } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { ClientService } from '../clients/client.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { StockService } from '../inventaire/inventaire.service';
import { PieceDetacheeService } from '../pieces-detachees/piece-detachee.service';
import { BonDeSortieService } from '../bons-de-sortie/bon-de-sortie.service';
import { OrdreReparationService } from '../ordres-reparation/ordre-reparation.service';
import { GarageContextService } from '../../core/services/garage-context.service';
import { GarageService } from '../../services/garage.service';
import { DashboardService } from './dashboard.service';
import {
  DashboardSuperAgentResponseDTO,
  DashboardAgentResponse,
  DashboardChefAtelierResponse,
  DashboardAgentMagasinResponse,
  UserModel,
  VehiculeModel,
  AlerteStock,
  BonDeSortie,
  extractContent
} from '../../shared/models/index';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, LucidePlus, LucideUsers, LucideCar, LucideAlertTriangle, LucideClock, LucidePackage, LucideArrowRight, LucideCheckCircle, LucideBuilding, LucideCalendar],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private stockService = inject(StockService);
  private pieceService = inject(PieceDetacheeService);
  private bonService = inject(BonDeSortieService);
  private ficheService = inject(OrdreReparationService);
  private garageContext = inject(GarageContextService);
  private garageService = inject(GarageService);
  private dashboardService = inject(DashboardService);

  garages: any[] = [];
  isGarageSelectionMode = false;
  superAgentData: DashboardSuperAgentResponseDTO | null = null;

  recentClients: any[] = [];
  recentVehicules: any[] = [];
  alertes: any[] = [];
  bonsEnAttente: any[] = [];
  recentFiches: any[] = [];

  ficheStats = {
    reception: 0,
    diagnostic: 0,
    piecesMo: 0,
    proforma: 0,
    ordreDeTravail: 0,
    paiement: 0,
    pretALivrer: 0,
    livre: 0,
    totalActives: 0
  };
  totalClients = 0;
  totalVehicules = 0;
  totalAlertes = 0;
  totalRuptures = 0;
  totalStocksFaibles = 0;
  rupturesList: any[] = [];
  stocksFaiblesList: any[] = [];
  loading = true;
  loadingFiches = true;

  get role(): string { return this.authService.getRole() ?? ''; }
  get username(): string { return this.authService.getUsername() ?? ''; }

  get isSuperAgent() { return this.role === 'ROLE_SUPER_AGENT'; }
  get isMaster() { return this.role === 'ROLE_MASTER'; }
  get isAgent() { return this.role === 'ROLE_AGENT'; }
  get isChefAtelier() { return this.role === 'ROLE_CHEF_ATELIER'; }
  get isMagasinier() { return this.role === 'ROLE_AGENT_MAGASIN'; }

  ngOnInit() {
    this.garageContext.activeGarageId$.subscribe(id => {
      if (this.isSuperAgent && !id) {
        this.isGarageSelectionMode = true;
        this.loadGarages();
      } else {
        this.isGarageSelectionMode = false;
        this.loadDashboardData();
      }
    });
  }

  loadGarages() {
    this.loading = true;
    this.garageService.getAll().subscribe({
      next: (data) => {
        this.garages = extractContent(data);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  selectGarage(g: any) {
    this.garageContext.enterGarage(g.id, g.nom);
  }

  loadDashboardData() {
    this.loading = true;
    this.loaded = 0;

    if (this.isSuperAgent || this.isMaster) {
      this.dashboardService.getSuperAgentDashboard().subscribe({
        next: (res: any) => {
          const d: DashboardSuperAgentResponseDTO = res?.data || res;
          this.superAgentData = d;
          this.totalClients = d.totalClients ?? 0;
          this.totalVehicules = d.totalVehicules ?? 0;
          this.applyEtatOrdresReparation(d.etatOrdresReparation);
          this.recentFiches = d.ordresRecents ?? [];
          this.recentClients = (d.clientsRecents ?? []).map((c: any) => ({ id: c.id, firstName: c.nom, lastName: '', phone: c.telephone, role: 'CLIENT' }));
          this.alertes = (d.alertesStock ?? []).map((a: any) => ({ id: a.id, pieceId: a.id, reference: a.reference, designation: a.designation, stockMagasin: a.stockMagasin, typeAlerte: a.statut }));
          this.bonsEnAttente = new Array(d.totalBonsDeSortieEnAttente ?? 0);
          this.loading = false;
          this.loadingFiches = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.loadingFiches = false;
          this.cdr.markForCheck();
        }
      });
      return;
    }

    if (this.isAgent) {
      this.dashboardService.getAgentDashboard().subscribe({
        next: (res: any) => {
          const d: DashboardAgentResponse = res?.data || res;
          this.totalClients = d.totalClients ?? 0;
          this.totalVehicules = d.totalVehicules ?? 0;
          this.bonsEnAttente = d.bonsDeSortieEnAttente ?? [];
          this.applyEtatOrdresReparation(d.etatOrdresReparation);
          this.recentClients = (d.clientsRecents ?? []).map((c: any) => ({ id: c.id, firstName: c.nom, lastName: '', phone: c.telephone, role: 'CLIENT' }));
          this.loading = false;
          this.loadingFiches = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.loadingFiches = false;
          this.cdr.markForCheck();
        }
      });
      return;
    }

    if (this.isChefAtelier) {
      this.dashboardService.getChefAtelierDashboard().subscribe({
        next: (res: any) => {
          const d: DashboardChefAtelierResponse = res?.data || res;
          this.totalVehicules = d.totalVehicules ?? 0;
          this.bonsEnAttente = d.bonsDeSortieEnAttenteValidation ?? [];
          this.applyEtatOrdresReparation(d.etatOrdresReparation);
          this.loading = false;
          this.loadingFiches = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.loadingFiches = false;
          this.cdr.markForCheck();
        }
      });
      return;
    }

    if (this.isMagasinier) {
      this.dashboardService.getAgentMagasinDashboard().subscribe({
        next: (res: any) => {
          const d: DashboardAgentMagasinResponse = res?.data || res;
          this.totalAlertes = d.totalAlertes ?? 0;
          this.totalRuptures = d.totalRuptures ?? 0;
          this.totalStocksFaibles = d.totalStocksFaibles ?? 0;
          this.bonsEnAttente = new Array(d.totalBonsEnAttente ?? 0);
          this.rupturesList = d.rupturesDeStock ?? [];
          this.stocksFaiblesList = d.stocksFaibles ?? [];
          this.alertes = [
            ...(d.rupturesDeStock ?? []).map((r: any) => ({ ...r, pieceId: r.id, typeAlerte: 'RUPTURE' })),
            ...(d.stocksFaibles ?? []).map((s: any) => ({ ...s, pieceId: s.id, typeAlerte: 'STOCK_FAIBLE' }))
          ];
          this.loading = false;
          this.loadingFiches = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.loadingFiches = false;
          this.cdr.markForCheck();
        }
      });
      return;
    }
    setTimeout(() => {
      this.loading = false;
      this.cdr.markForCheck();
    }, 1500);
  }

  private loaded = 0;
  private done() {
    if (++this.loaded >= 1) {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  get ruptures(): AlerteStock[] {
    return (Array.isArray(this.alertes) ? this.alertes : []).filter(a => a.typeAlerte === 'RUPTURE');
  }

  get stocksFaibles(): AlerteStock[] {
    return (Array.isArray(this.alertes) ? this.alertes : []).filter(a => a.typeAlerte === 'STOCK_FAIBLE');
  }

  private applyEtatOrdresReparation(etat?: any): void {
    if (!etat) return;
    this.ficheStats.reception = etat.reception ?? etat.RECEPTION ?? 0;
    this.ficheStats.diagnostic = etat.diagnostic ?? etat.DIAGNOSTIC ?? 0;
    this.ficheStats.piecesMo = etat.piecesMo ?? etat.piecesMO ?? etat.PIECES_MO ?? etat.attentePieces ?? 0;
    this.ficheStats.proforma = etat.proforma ?? etat.PROFORMA ?? etat.attenteProforma ?? 0;
    this.ficheStats.ordreDeTravail =
      etat.ordreDeTravail ??
      etat.ordreTravail ??
      etat.ORDRE_DE_TRAVAIL ??
      ((etat.proformaValide ?? 0) + (etat.attenteSortie ?? 0) + (etat.enReparation ?? 0));
    this.ficheStats.paiement = etat.paiement ?? etat.PAIEMENT ?? etat.attentePaiement ?? 0;
    this.ficheStats.pretALivrer = etat.pretALivrer ?? etat.PRET_A_LIVRER ?? etat.termine ?? 0;
    this.ficheStats.livre = etat.livre ?? etat.LIVRE ?? 0;
    this.ficheStats.totalActives = etat.totalActifs ?? (
      this.ficheStats.reception +
      this.ficheStats.diagnostic +
      this.ficheStats.piecesMo +
      this.ficheStats.proforma +
      this.ficheStats.ordreDeTravail +
      this.ficheStats.paiement +
      this.ficheStats.pretALivrer
    );
  }

  statutLabel(statut?: string | null): string {
    switch (statut) {
      case 'RECEPTION':
      case 'A_FAIRE': return 'Réception';
      case 'DIAGNOSTIC':
      case 'EN_DIAGNOSTIC': return 'Diagnostic';
      case 'PIECES_MO':
      case 'EN_ATTENTE_PIECES_MO': return 'Pièces & MO';
      case 'PROFORMA':
      case 'EN_ATTENTE_PROFORMA': return 'Proforma';
      case 'ORDRE_DE_TRAVAIL':
      case 'BON_DE_COMMANDE':
      case 'BON_DE_SORTIE':
      case 'ASSIGN_TECHNICIEN':
      case 'REPARATION':
      case 'PROFORMA_VALIDE':
      case 'EN_ATTENTE_COMMANDE':
      case 'EN_ATTENTE_SORTIE':
      case 'EN_ATTENTE_MECANICIEN':
      case 'EN_COURS': return 'Ordre de Travail';
      case 'BL':
      case 'EN_ATTENTE_BL':
      case 'PAIEMENT':
      case 'EN_ATTENTE_PAIEMENT': return 'BL';
      case 'PRET_A_LIVRER':
      case 'TERMINE': return 'Prêt';
      case 'LIVRE': return 'Livré';
      default: return statut || '—';
    }
  }

  formatDate(d: string): string { return new Date(d).toLocaleString('fr-FR'); }
}
