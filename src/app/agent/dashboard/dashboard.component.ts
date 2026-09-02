import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideUsers, LucideCar, LucideAlertTriangle, LucideClock, LucidePackage, LucideArrowRight, LucideCheckCircle, LucideBuilding } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { ClientService, UserModel } from '../clients/client.service';
import { VehiculeService, VehiculeModel } from '../vehicules/vehicule.service';
import { StockService } from '../stock/stock.service';
import { PieceDetacheeService, AlerteStock } from '../pieces-detachees/piece-detachee.service';
import { BonDeSortieService, BonDeSortie } from '../bons-de-sortie/bon-de-sortie.service';
import { OrdreReparationService } from '../ordres-reparation/ordre-reparation.service';
import { GarageContextService } from '../../core/services/garage-context.service';
import { GarageService } from '../../services/garage.service';
import { extractContent } from '../../shared/models/index';
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

  garages: any[] = [];
  isGarageSelectionMode = false;

  recentClients: UserModel[] = [];
  recentVehicules: VehiculeModel[] = [];
  alertes: AlerteStock[] = [];
  bonsEnAttente: BonDeSortie[] = [];
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
    if (this.isSuperAgent || this.isMaster || this.isAgent) {
      this.clientService.getAll().subscribe({
        next: (res: any) => {
          const list = extractContent<UserModel>(res);
          this.totalClients = list.length;
          this.recentClients = list.slice(0, 5);
          this.done();
        },
        error: () => this.done()
      });
      this.vehiculeService.getAll().subscribe({
        next: (res: any) => {
          const list = extractContent<VehiculeModel>(res);
          this.totalVehicules = list.length;
          this.recentVehicules = list.slice(0, 5);
          this.done();
        },
        error: () => this.done()
      });
    }
    if (this.isSuperAgent || this.isMaster || this.isAgent || this.isChefAtelier) {
      this.ficheService.getAll().subscribe({
        next: (res: any) => {
          const data = extractContent<any>(res);
          this.ficheStats.aFaire = data.filter((f: any) => f.statut === 'A_FAIRE').length;
          this.ficheStats.diagnostic = data.filter((f: any) => f.statut === 'EN_DIAGNOSTIC').length;
          this.ficheStats.attenteProforma = data.filter((f: any) => f.statut === 'EN_ATTENTE_PROFORMA').length;
          this.ficheStats.proformaValide = data.filter((f: any) => f.statut === 'PROFORMA_VALIDE').length;
          this.ficheStats.attentePieces = data.filter((f: any) => f.statut === 'EN_ATTENTE_COMMANDE').length;
          this.ficheStats.attenteSortie = data.filter((f: any) => f.statut === 'EN_ATTENTE_SORTIE').length;
          this.ficheStats.enCours = data.filter((f: any) => f.statut === 'EN_COURS').length;
          this.ficheStats.attentePaiement = data.filter((f: any) => f.statut === 'EN_ATTENTE_PAIEMENT').length;
          this.ficheStats.termine = data.filter((f: any) => f.statut === 'TERMINE').length;
          this.ficheStats.livre = data.filter((f: any) => f.statut === 'LIVRE').length;

          this.ficheStats.totalActives = data.filter((f: any) => f.statut !== 'LIVRE' && f.statut !== 'A_FAIRE').length;
          this.recentFiches = [...data].sort((a: any, b: any) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()).slice(0, 5);
          this.loadingFiches = false;
          this.done();
        },
        error: () => {
          this.loadingFiches = false;
          this.done();
        }
      });
    }
    if (this.isSuperAgent || this.isMaster || this.isMagasinier) {
      this.stockService.alertes().subscribe({ next: (d) => { this.alertes = d; this.done(); }, error: () => this.done() });
    }
    if (this.isSuperAgent || this.isMaster || this.isAgent || this.isChefAtelier || this.isMagasinier) {
      this.bonService.getAll({ statut: 'EN_ATTENTE' }).subscribe({ next: (d) => { this.bonsEnAttente = d; this.done(); }, error: () => this.done() });
    }
    if (this.isChefAtelier) {
      this.vehiculeService.getAll().subscribe({ next: (d) => { this.totalVehicules = d.length; this.recentVehicules = d.slice(0, 5); this.done(); }, error: () => this.done() });
    }
    if (this.isMagasinier) {
      this.pieceService.getAll({ statut: 'ACTIF' }).subscribe({ next: (d) => { this.totalVehicules = d.length; this.done(); }, error: () => this.done() });
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

  get ruptures(): AlerteStock[] { return this.alertes.filter(a => a.typeAlerte === 'RUPTURE'); }
  get stocksFaibles(): AlerteStock[] { return this.alertes.filter(a => a.typeAlerte === 'STOCK_FAIBLE'); }

  formatDate(d: string): string { return new Date(d).toLocaleString('fr-FR'); }
}
