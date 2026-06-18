import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { ClientService, UserModel } from '../services/client.service';
import { VehiculeService, VehiculeModel } from '../services/vehicule.service';
import { StockService } from '../services/stock.service';
import { PieceDetacheeService, AlerteStock } from '../services/piece-detachee.service';
import { BonDeSortieService, BonDeSortie } from '../services/bon-de-sortie.service';
import { FicheAtelierService } from '../services/fiche-atelier.service';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private stockService = inject(StockService);
  private pieceService = inject(PieceDetacheeService);
  private bonService = inject(BonDeSortieService);

  recentClients: UserModel[] = [];
  recentVehicules: VehiculeModel[] = [];
  alertes: AlerteStock[] = [];
  bonsEnAttente: BonDeSortie[] = [];

  private ficheService = inject(FicheAtelierService);
  ficheStats = { aFaire: 0, diagnostic: 0, proforma: 0, attentePieces: 0, enCours: 0, termine: 0, totalActives: 0 };
  totalClients = 0;
  totalVehicules = 0;
  loading = true;

  get role(): string { return this.authService.getRole() ?? ''; }
  get username(): string { return this.authService.getUsername() ?? ''; }

  get isSuperAgent()  { return this.role === 'ROLE_SUPER_AGENT'; }
  get isAgent()       { return this.role === 'ROLE_AGENT'; }
  get isChefAtelier() { return this.role === 'ROLE_CHEF_ATELIER'; }
  get isMagasinier()  { return this.role === 'ROLE_AGENT_MAGASIN'; }

  ngOnInit() {
    if (this.isSuperAgent || this.isAgent) {
      this.clientService.getAll().subscribe({ next: (d) => { this.totalClients = d.length; this.recentClients = d.slice(0, 5); this.done(); }, error: () => this.done() });
      this.vehiculeService.getAll().subscribe({ next: (d) => { this.totalVehicules = d.length; this.recentVehicules = d.slice(0, 5); this.done(); }, error: () => this.done() });
    }
    if (this.isSuperAgent || this.isAgent || this.isChefAtelier) {
      this.ficheService.getAll().subscribe({
        next: (data) => {
          this.ficheStats.aFaire = data.filter(f => f.statut === 'A_FAIRE').length;
          this.ficheStats.diagnostic = data.filter(f => f.statut === 'EN_DIAGNOSTIC').length;
          this.ficheStats.proforma = data.filter(f => f.statut === 'EN_ATTENTE_PROFORMA' as any).length;
          this.ficheStats.attentePieces = data.filter(f => f.statut === 'EN_ATTENTE_COMMANDE' as any).length;
          this.ficheStats.enCours = data.filter(f => f.statut === 'EN_COURS').length;
          this.ficheStats.termine = data.filter(f => f.statut === 'TERMINE').length;
          this.ficheStats.totalActives = this.ficheStats.aFaire + this.ficheStats.diagnostic + this.ficheStats.proforma + this.ficheStats.attentePieces + this.ficheStats.enCours + this.ficheStats.termine;
          this.done();
        },
        error: () => this.done()
      });
    }
    if (this.isSuperAgent || this.isMagasinier) {
      this.stockService.alertes().subscribe({ next: (d) => { this.alertes = d; this.done(); }, error: () => this.done() });
    }
    if (this.isSuperAgent || this.isAgent || this.isChefAtelier || this.isMagasinier) {
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
