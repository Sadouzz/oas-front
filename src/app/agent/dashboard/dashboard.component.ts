import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideUsers, LucideCar, LucideAlertTriangle, LucideClock, LucidePackage, LucideArrowRight, LucideCheckCircle, LucideBuilding } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { ClientService, UserModel } from '../clients/client.service';
import { VehiculeService, VehiculeModel } from '../vehicules/vehicule.service';
import { StockService } from '../pieces-detachees/stock.service';
import { PieceDetacheeService, AlerteStock } from '../pieces-detachees/piece-detachee.service';
import { BonDeSortieService, BonDeSortie } from '../bons-de-sortie/bon-de-sortie.service';
import { OrdreReparationService } from '../ordres-reparation/ordre-reparation.service';
import { GarageContextService } from '../../core/services/garage-context.service';
import { GarageService } from '../../services/garage.service';
import { DashboardService } from './dashboard.service';
import {
  DashboardSuperAgentResponseDTO,
  DashboardAgentResponse,
  DashboardChefAtelierResponse,
  DashboardAgentMagasinResponse,
  extractContent
} from '../../shared/models/index';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, LucidePlus, LucideUsers, LucideCar, LucideAlertTriangle, LucideClock, LucidePackage, LucideArrowRight, LucideCheckCircle, LucideBuilding],
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
    aFaire: 0,
    diagnostic: 0,
    attenteProforma: 0,
    proformaValide: 0,
    attentePieces: 0,
    attenteSortie: 0,
    enCours: 0,
    attentePaiement: 0,
    termine: 0,
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
          if (d.etatOrdresReparation) {
            this.ficheStats.diagnostic = d.etatOrdresReparation.diagnostic ?? 0;
            this.ficheStats.attenteProforma = d.etatOrdresReparation.attenteProforma ?? 0;
            this.ficheStats.proformaValide = d.etatOrdresReparation.proformaValide ?? 0;
            this.ficheStats.attentePieces = d.etatOrdresReparation.attentePieces ?? 0;
            this.ficheStats.attenteSortie = d.etatOrdresReparation.attenteSortie ?? 0;
            this.ficheStats.enCours = d.etatOrdresReparation.enReparation ?? 0;
            this.ficheStats.attentePaiement = d.etatOrdresReparation.attentePaiement ?? 0;
            this.ficheStats.termine = d.etatOrdresReparation.termine ?? 0;
            this.ficheStats.totalActives = d.etatOrdresReparation.totalActifs ?? 0;
          }
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
          if (d.etatOrdresReparation) {
            this.ficheStats.diagnostic = d.etatOrdresReparation.diagnostic ?? 0;
            this.ficheStats.attenteProforma = d.etatOrdresReparation.attenteProforma ?? 0;
            this.ficheStats.proformaValide = d.etatOrdresReparation.proformaValide ?? 0;
            this.ficheStats.attentePieces = d.etatOrdresReparation.attentePieces ?? 0;
            this.ficheStats.attenteSortie = d.etatOrdresReparation.attenteSortie ?? 0;
            this.ficheStats.enCours = d.etatOrdresReparation.enReparation ?? 0;
            this.ficheStats.attentePaiement = d.etatOrdresReparation.attentePaiement ?? 0;
            this.ficheStats.termine = d.etatOrdresReparation.termine ?? 0;
            this.ficheStats.totalActives = d.etatOrdresReparation.totalActifs ?? 0;
          }
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
          if (d.etatOrdresReparation) {
            this.ficheStats.diagnostic = d.etatOrdresReparation.diagnostic ?? 0;
            this.ficheStats.attenteProforma = d.etatOrdresReparation.attenteProforma ?? 0;
            this.ficheStats.proformaValide = d.etatOrdresReparation.proformaValide ?? 0;
            this.ficheStats.attentePieces = d.etatOrdresReparation.attentePieces ?? 0;
            this.ficheStats.attenteSortie = d.etatOrdresReparation.attenteSortie ?? 0;
            this.ficheStats.enCours = d.etatOrdresReparation.enReparation ?? 0;
            this.ficheStats.attentePaiement = d.etatOrdresReparation.attentePaiement ?? 0;
            this.ficheStats.termine = d.etatOrdresReparation.termine ?? 0;
            this.ficheStats.totalActives = d.etatOrdresReparation.totalActifs ?? 0;
          }
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

  formatDate(d: string): string { return new Date(d).toLocaleString('fr-FR'); }
}
