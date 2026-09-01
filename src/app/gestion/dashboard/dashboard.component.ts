import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePlus, LucideUsers, LucideCar, LucideAlertTriangle, LucideClock, LucidePackage, LucideArrowRight, LucideCheckCircle, LucideBuilding } from '@lucide/angular';
import { AuthService } from '../auth/services/auth.service';
import { ClientService, UserModel } from '../../services/client.service';
import { VehiculeService, VehiculeModel } from '../../services/vehicule.service';
import { StockService } from '../../services/stock.service';
import { PieceDetacheeService, AlerteStock } from '../../services/piece-detachee.service';
import { BonDeSortieService, BonDeSortie } from '../../services/bon-de-sortie.service';
import { OrdreReparationService } from '../../services/ordre-reparation.service';
import { GarageContextService } from '../../core/services/garage-context.service';
import { GarageService } from '../../services/garage.service';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, LucidePlus, LucideUsers, LucideCar, LucideAlertTriangle, LucideClock, LucidePackage, LucideArrowRight, LucideCheckCircle, LucideBuilding],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private stockService = inject(StockService);
  private pieceService = inject(PieceDetacheeService);
  private bonService = inject(BonDeSortieService);
  private garageContext = inject(GarageContextService);
  private garageService = inject(GarageService);

  garages: any[] = [];
  isGarageSelectionMode = false;

  recentClients: UserModel[] = [];
  recentVehicules: VehiculeModel[] = [];
  alertes: AlerteStock[] = [];
  bonsEnAttente: BonDeSortie[] = [];
  recentFiches: any[] = [];

  private ficheService = inject(OrdreReparationService);
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

  get isSuperAgent()  { return this.role === 'ROLE_SUPER_AGENT'; }
  get isMaster()      { return this.role === 'ROLE_MASTER'; }
  get isAgent()       { return this.role === 'ROLE_AGENT'; }
  get isChefAtelier() { return this.role === 'ROLE_CHEF_ATELIER'; }
  get isMagasinier()  { return this.role === 'ROLE_AGENT_MAGASIN'; }

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
        this.garages = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
      this.clientService.getAll().subscribe({ next: (d) => { this.totalClients = d.length; this.recentClients = d.slice(0, 5); this.done(); }, error: () => this.done() });
      this.vehiculeService.getAll().subscribe({ next: (d) => { this.totalVehicules = d.length; this.recentVehicules = d.slice(0, 5); this.done(); }, error: () => this.done() });
    }
    if (this.isSuperAgent || this.isMaster || this.isAgent || this.isChefAtelier) {
      this.ficheService.getAll().subscribe({
        next: (data) => {
          this.ficheStats.aFaire = data.filter(f => f.statut === 'A_FAIRE').length;
          this.ficheStats.diagnostic = data.filter(f => f.statut === 'EN_DIAGNOSTIC').length;
          this.ficheStats.attenteProforma = data.filter(f => f.statut === 'EN_ATTENTE_PROFORMA').length;
          this.ficheStats.proformaValide = data.filter(f => f.statut === 'PROFORMA_VALIDE').length;
          this.ficheStats.attentePieces = data.filter(f => f.statut === 'EN_ATTENTE_COMMANDE').length;
          this.ficheStats.attenteSortie = data.filter(f => f.statut === 'EN_ATTENTE_SORTIE').length;
          this.ficheStats.enCours = data.filter(f => f.statut === 'EN_COURS').length;
          this.ficheStats.attentePaiement = data.filter(f => f.statut === 'EN_ATTENTE_PAIEMENT').length;
          this.ficheStats.termine = data.filter(f => f.statut === 'TERMINE').length;
          this.ficheStats.livre = data.filter(f => f.statut === 'LIVRE').length;
          
          this.ficheStats.totalActives = data.filter(f => f.statut !== 'LIVRE' && f.statut !== 'A_FAIRE').length;
          this.recentFiches = [...data].sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()).slice(0, 5);
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
    setTimeout(() => this.loading = false, 1500);
  }

  private loaded = 0;
  private done() { if (++this.loaded >= 1) this.loading = false; }

  get ruptures(): AlerteStock[] { return this.alertes.filter(a => a.typeAlerte === 'RUPTURE'); }
  get stocksFaibles(): AlerteStock[] { return this.alertes.filter(a => a.typeAlerte === 'STOCK_FAIBLE'); }

  formatDate(d: string): string { return new Date(d).toLocaleString('fr-FR'); }
}
