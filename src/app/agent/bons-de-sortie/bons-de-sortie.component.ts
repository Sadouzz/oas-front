import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { BonDeSortieService } from './bon-de-sortie.service';
import { BonDeSortie, BonDeSortieHistorique } from './models/bon-de-sortie.model';
import { ClientService } from '../clients/client.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { PieceDetacheeService } from '../pieces-detachees/piece-detachee.service';
import { MainDoeuvreService } from '../main-doeuvre/main-doeuvre.service';
import { OrdreReparationService } from '../ordres-reparation/ordre-reparation.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { UserModel, VehiculeModel, PieceDetache, MainDoeuvreModel, extractContent } from '../../shared/models';
import { LucidePlus, LucideSearch, LucideTrash2, LucideX, LucideCheck, LucideCheckCircle, LucideLoader2, LucideUser, LucideCar, LucideClock, LucidePackage, LucideFileText } from '@lucide/angular';

export interface LignePieceBS {
  type: 'PDP' | 'PDG' | 'PDS' | 'MAIN_DOEUVRE';
  piece?: PieceDetache;
  mainDoeuvre?: MainDoeuvreModel;
  designation: string;
  quantite: number;
  prix?: number | null;
}

type TypePieceBS = 'PDP' | 'PDG';

export interface LigneDetailStockValidation {
  pieceId: number;
  reference: string;
  designation: string;
  quantite: number;
  stockMagasinAv: number;
  stockMagasinAp: number;
  stockAtelierAv: number;
  stockAtelierAp: number;
}

@Component({
  selector: 'app-bons-de-sortie',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PaginationComponent,
    AlertComponent,
    SearchableSelectComponent,
    LucidePlus,
    LucideSearch,
    LucideTrash2,
    LucideX,
    LucideCheck,
    LucideCheckCircle,
    LucideLoader2,
    LucideUser,
    LucideCar,
    LucideClock,
    LucidePackage,
    LucideFileText
  ],
  templateUrl: './bons-de-sortie.component.html',
})
export class BonsDeSortieComponent extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bonService = inject(BonDeSortieService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private mainDoeuvreService = inject(MainDoeuvreService);
  private ordreReparationService = inject(OrdreReparationService);
  private authService = inject(AuthService);

  bons: BonDeSortie[] = [];
  filtered: BonDeSortie[] = [];

  clients: UserModel[] = [];
  vehiculesFiltres: VehiculeModel[] = [];
  piecesPdp: PieceDetache[] = [];
  piecesPdg: PieceDetache[] = [];
  mainDoeuvres: MainDoeuvreModel[] = [];
  lignesPieces: LignePieceBS[] = [];

  piecePdpAjouter: number | null = null;
  piecePdgAjouter: number | null = null;
  piecePdsDesignationAjouter = '';
  mainDoeuvreAjouter: number | null = null;
  contextOrdreReparationId: number | null = null;
  contextOrdreTravailId: number | null = null;
  returnToContext: string | null = null;
  private quantitesPrevues = new Map<string, number>();
  private quantitesDejaSorties = new Map<string, number>();
  chargementQuantitesOR = false;
  private chargementsContexteEnCours = 0;
  qteAjouterPdp = 1;
  prixAjouterPdp: number | null = null;
  qteAjouterPdg = 1;
  prixAjouterPdg: number | null = null;
  qteAjouterPds = 1;
  prixAjouterPds: number | null = null;
  qteAjouterMO = 1;
  prixAjouterMO: number | null = null;

  loading = false;
  saving = false;
  loadingVehicules = false;
  loadingPdp = false;
  successMessage = '';
  errorMessage = '';

  private pieceSearchDebounces: Partial<Record<TypePieceBS, ReturnType<typeof setTimeout>>> = {};

  historique: BonDeSortieHistorique[] = [];
  loadingHistorique = false;

  showCreateModal = false;
  showDetailModal = false;
  selectedBon: BonDeSortie | null = null;

  // Modal de validation avec détails des stocks
  showValidateModal = false;
  bonToValidate: BonDeSortie | null = null;
  validating = false;
  validationDetails: LigneDetailStockValidation[] = [];
  loadingValidationDetails = false;

  // Modal de retour de pièce
  showReturnPieceModal = false;
  pieceToReturn: any = null;
  returningPiece = false;

  clientOpen = false;
  vehiculeOpen = false;
  clientFilter = '';
  vehiculeFilter = '';

  filterStatut = '';
  dateDebut = '';
  dateFin = '';
  filterVehicule = '';
  showDateFilter = false;

  form = this.fb.group({
    clientId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null, Validators.required],
    remarque: [''],
  });

  get role(): string { return this.authService.getRole() ?? ''; }
  get canCreate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT', 'ROLE_AGENT_MAGASIN', 'ROLE_CHEF_ATELIER'].includes(this.role); }
  get canValidate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'].includes(this.role); }
  canValidateBon(bon: BonDeSortie): boolean {
    return this.canValidate && ['PAIEMENT', 'PRET_A_LIVRER', 'LIVRE'].includes(bon.ordreReparationStatut ?? '');
  }

  selectedClient: UserModel | null = null;
  loadingClients = false;
  private clientSearchDebounce: any;

  // ── Searchable selects ──────────────────────────────────────────

  get clientLabel(): string {
    if (this.selectedClient) {
      return `${this.selectedClient.firstName} ${this.selectedClient.lastName}`;
    }
    const id = this.form.get('clientId')?.value;
    if (!id) return '';
    const c = this.clients.find(x => x.id === Number(id));
    return c ? `${c.firstName} ${c.lastName}` : '';
  }

  get vehiculeLabel(): string {
    const id = this.form.get('vehiculeId')?.value;
    if (!id) return '';
    const v = this.vehiculesFiltres.find(x => x.id === Number(id));
    return v ? `${v.immatriculation} — ${v.marque} ${v.modele}` : '';
  }

  get filteredClients(): UserModel[] {
    return this.clients;
  }

  get filteredVehicules(): VehiculeModel[] {
    if (!this.vehiculeFilter) return this.vehiculesFiltres;
    const kw = this.vehiculeFilter.toLowerCase();
    return this.vehiculesFiltres.filter(v =>
      v.immatriculation.toLowerCase().includes(kw) ||
      `${v.marque} ${v.modele}`.toLowerCase().includes(kw)
    );
  }

  loadPdpPieces(keyword: string = '', type: TypePieceBS = 'PDP') {
    this.loadingPdp = true;
    const params: any = { page: 0, size: 50, type };
    if (keyword && keyword.trim()) {
      params.keyword = keyword.trim();
    }
    this.pieceService.getAll(params).subscribe({
      next: (res) => {
        const pieces = extractContent<PieceDetache>(res as any).filter(p => p.statut === 'ACTIF');
        if (type === 'PDP') this.piecesPdp = pieces;
        else this.piecesPdg = pieces;
        this.loadingPdp = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPdp = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadMainDoeuvres(): void {
    this.mainDoeuvreService.getAll({ page: 0, size: 50, isArchived: false }).subscribe({
      next: res => { this.mainDoeuvres = extractContent<MainDoeuvreModel>(res as any).filter(x => !x.isArchived); this.cdr.markForCheck(); },
      error: () => { this.mainDoeuvres = []; this.cdr.markForCheck(); }
    });
  }

  onMainDoeuvreSelected(id: number | null): void {
    const mo = this.mainDoeuvres.find(x => x.id === Number(id));
    this.prixAjouterMO = mo?.prix ?? null;
    this.qteAjouterMO = mo ? this.quantiteRestantePlanifiee(`mo:${mo.id}`, mo.nbreHeure ?? 0) : 1;
  }

  private quantiteRestantePlanifiee(key: string, prevue: number): number {
    if (!prevue) return 1;
    const dejaSortie = this.quantitesDejaSorties.get(key) ?? 0;
    const dejaAjoutee = this.lignesPieces
      .filter(l => this.cleLigne(l) === key)
      .reduce((sum, ligne) => sum + (Number(ligne.quantite) || 0), 0);
    return Math.max(0, prevue - dejaSortie - dejaAjoutee) || 1;
  }

  private cleLigne(ligne: LignePieceBS): string {
    if (ligne.type === 'MAIN_DOEUVRE') return `mo:${ligne.mainDoeuvre?.id}`;
    if (ligne.piece) return `piece:${ligne.piece.id}`;
    return `pds:${ligne.designation.trim().toLocaleLowerCase()}`;
  }

  onPdpSearch(term: string, type: TypePieceBS): void {
    clearTimeout(this.pieceSearchDebounces[type]);
    this.pieceSearchDebounces[type] = setTimeout(() => {
      this.loadPdpPieces(term, type);
    }, 300);
  }

  get lignesPdp(): LignePieceBS[] { return this.lignesPieces.filter(l => l.type === 'PDP'); }
  get lignesPdg(): LignePieceBS[] { return this.lignesPieces.filter(l => l.type === 'PDG'); }
  get lignesPds(): LignePieceBS[] { return this.lignesPieces.filter(l => l.type === 'PDS'); }
  get lignesMO(): LignePieceBS[] { return this.lignesPieces.filter(l => l.type === 'MAIN_DOEUVRE'); }

  get lignesPiecesPdp(): LignePieceBS[] {
    return this.lignesPieces;
  }

  getPiecePrice(p?: PieceDetache | null): number | null {
    if (!p) return null;
    const val = p.prixUnitaire ?? p.prix ?? (p as any).prixDeVente ?? (p as any).prixVente ?? p.prixGros;
    return val != null && val !== ('' as any) && !isNaN(Number(val)) ? Number(val) : null;
  }

  get totalPdp(): number {
    return this.lignesPiecesPdp.reduce((sum, l) => {
      const price = Number(l.prix) || 0;
      return sum + (price * (Number(l.quantite) || 0));
    }, 0);
  }

  get totalGeneral(): number {
    return this.totalPdp;
  }

  formatPiece = (p: PieceDetache) => {
    const stock = p.stockMagasin != null ? `(Stock: ${p.stockMagasin})` : '';
    const price = this.getPiecePrice(p);
    const prix = price != null ? `— ${price} FCFA` : '';
    return `${p.reference} — ${p.designation} ${prix} ${stock}`.trim();
  };

  get selectedPiecePdp(): PieceDetache | undefined {
    return this.findSelectedPiece('PDP');
  }

  get selectedPiecePdg(): PieceDetache | undefined { return this.findSelectedPiece('PDG'); }

  private findSelectedPiece(type: TypePieceBS): PieceDetache | undefined {
    const id = type === 'PDP' ? this.piecePdpAjouter : this.piecePdgAjouter;
    const pieces = type === 'PDP' ? this.piecesPdp : this.piecesPdg;
    return id ? pieces.find(piece => piece.id === Number(id)) : undefined;
  }

  onPiecePdpSelected(pieceId: any, type: TypePieceBS): void {
    const pieceIdValue = pieceId == null ? null : Number(pieceId);
    if (type === 'PDP') this.piecePdpAjouter = pieceIdValue;
    else this.piecePdgAjouter = pieceIdValue;

    if (!pieceId) {
      if (type === 'PDP') this.prixAjouterPdp = null;
      else this.prixAjouterPdg = null;
      this.cdr.markForCheck();
      return;
    }
    const p = this.findSelectedPiece(type);
    if (p) {
      const prix = this.getPiecePrice(p);
      if (type === 'PDP') this.prixAjouterPdp = prix;
      else this.prixAjouterPdg = prix;
      const key = `piece:${p.id}`;
      const quantity = this.quantitesPrevues.has(key)
        ? this.quantiteRestantePlanifiee(key, this.quantitesPrevues.get(key) ?? 0)
        : 1;
      if (type === 'PDP') this.qteAjouterPdp = quantity;
      else this.qteAjouterPdg = quantity;
      this.errorMessage = '';
      this.cdr.markForCheck();
    }
  }

  addPiecePdp(type: TypePieceBS): void {
    this.errorMessage = '';
    const selectedId = type === 'PDP' ? this.piecePdpAjouter : this.piecePdgAjouter;
    const qteDemandee = Number(type === 'PDP' ? this.qteAjouterPdp : this.qteAjouterPdg) || 1;
    const prixSaisi = type === 'PDP' ? this.prixAjouterPdp : this.prixAjouterPdg;
    if (qteDemandee <= 0) {
      this.errorMessage = 'La quantité doit être supérieure à 0.';
      return;
    }
    if (!selectedId) return;
    const piece = this.findSelectedPiece(type);
    if (!piece) return;
    const currentQte = this.lignesPieces
      .filter(l => l.type === type && l.piece?.id === piece.id)
      .reduce((total, l) => total + (Number(l.quantite) || 0), 0);
    const stock = type === 'PDP' ? (piece.stockMagasin ?? 0) : Number.POSITIVE_INFINITY;
    if (type === 'PDP' && currentQte + qteDemandee > stock) {
      this.errorMessage = `Stock magasin insuffisant pour "${piece.designation}" : ${stock} disponible(s).`;
      return;
    }
    const prix = prixSaisi != null && prixSaisi !== ('' as any) ? Number(prixSaisi) : (this.getPiecePrice(piece) ?? 0);
    this.lignesPieces.push({ type, piece, designation: piece.designation, quantite: qteDemandee, prix });

    if (type === 'PDP') { this.piecePdpAjouter = null; this.qteAjouterPdp = 1; this.prixAjouterPdp = null; }
    else { this.piecePdgAjouter = null; this.qteAjouterPdg = 1; this.prixAjouterPdg = null; }
    this.cdr.markForCheck();
  }

  addPiecePds(): void {
    this.errorMessage = '';
    const designation = this.piecePdsDesignationAjouter.trim();
    const quantite = Number(this.qteAjouterPds) || 0;
    if (!designation) { this.errorMessage = 'Renseignez la désignation de la pièce PDS.'; return; }
    if (quantite <= 0) { this.errorMessage = 'La quantité doit être supérieure à zéro.'; return; }
    this.lignesPieces.push({ type: 'PDS', designation, quantite, prix: Number(this.prixAjouterPds) || 0 });
    this.piecePdsDesignationAjouter = '';
    this.qteAjouterPds = 1;
    this.prixAjouterPds = null;
    this.cdr.markForCheck();
  }

  addMainDoeuvre(): void {
    this.errorMessage = '';
    const qte = Number(this.qteAjouterMO) || 0;
    const mo = this.mainDoeuvres.find(item => item.id === Number(this.mainDoeuvreAjouter));
    if (!mo) { this.errorMessage = 'Sélectionnez une main-d’œuvre.'; return; }
    if (qte <= 0) { this.errorMessage = 'Le nombre d’heures doit être supérieur à zéro.'; return; }
    this.lignesPieces.push({ type: 'MAIN_DOEUVRE', mainDoeuvre: mo, designation: mo.description, quantite: qte, prix: Number(this.prixAjouterMO ?? mo.prix) });
    this.mainDoeuvreAjouter = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
    this.cdr.markForCheck();
  }

  onLineQteChange(l: LignePieceBS) {
    if (l.type !== 'PDP' || !l.piece) { this.errorMessage = Number(l.quantite) > 0 ? '' : 'La quantité doit être supérieure à zéro.'; return; }
    const stock = l.piece.stockMagasin ?? 0;
    const qte = Number(l.quantite) || 0;
    if (qte > stock) {
      this.errorMessage = `Attention : la quantité pour "${l.designation}" (${qte}) dépasse le stock magasin disponible (${stock}).`;
    } else if (qte <= 0) {
      this.errorMessage = `La quantité pour "${l.designation}" doit être au moins de 1.`;
    } else {
      this.errorMessage = '';
    }
    this.cdr.markForCheck();
  }

  removePiece(item: LignePieceBS) {
    this.lignesPieces = this.lignesPieces.filter(l => l !== item);
    this.errorMessage = '';
  }

  loadClients(keyword: string = '') {
    this.loadingClients = true;
    const params: any = { page: 0, size: 10 };
    if (keyword && keyword.trim()) {
      params.keyword = keyword.trim();
    }
    this.clientService.getAll(params).subscribe({
      next: (res) => {
        this.clients = extractContent<UserModel>(res as any).filter(c => c.enabled !== false);
        this.loadingClients = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingClients = false;
        this.cdr.markForCheck();
      }
    });
  }

  onClientSearch(keyword: string) {
    this.clientFilter = keyword;
    this.clientOpen = true;
    clearTimeout(this.clientSearchDebounce);
    this.clientSearchDebounce = setTimeout(() => {
      this.loadClients(keyword);
    }, 300);
  }

  selectClient(c: UserModel) {
    this.selectedClient = c;
    this.form.patchValue({ clientId: c.id, vehiculeId: null });
    this.vehiculesFiltres = [];
    this.clientFilter = '';
    this.clientOpen = false;
    if (c.id) {
      this.loadingVehicules = true;
      this.vehiculeService.getByClient(c.id).subscribe({
        next: (vList) => {
          this.vehiculesFiltres = extractContent<VehiculeModel>(vList as any);
          this.loadingVehicules = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.vehiculesFiltres = [];
          this.loadingVehicules = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  selectVehicule(v: VehiculeModel) {
    this.form.patchValue({ vehiculeId: v.id });
    this.vehiculeFilter = '';
    this.vehiculeOpen = false;
  }

  // ── Lifecycle ───────────────────────────────────────────────────

  ngOnInit() {
    this.loadData();
    this.loadPdpPieces('');

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openCreate(params);
      }
      if (params['statut']) {
        this.filterStatut = params['statut'];
      } else if (!params['action']) {
        this.filterStatut = '';
      }
      if (params['search'] === 'auto-date') {
        this.showDateFilter = true;
      }
      this.applyFilter(); this.cdr.markForCheck();
    });
  }

  loadData() {
    this.loadBons();
  }

  loadBons() {
    this.loading = true;
    this.bonService.getAll(this.getPageParams()).subscribe({
      next: (d) => {
        const arr = this.applyPageResponse<BonDeSortie>(d);
        this.bons = arr.sort((a: any, b: any) => b.id - a.id);
        this.applyFilter(); this.cdr.markForCheck(); this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  applyFilter() {
    let data = this.bons;
    if (this.filterStatut) data = data.filter(b => b.statut === this.filterStatut);
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      data = data.filter(b =>
        (b.reference ?? '').toLowerCase().includes(kw) ||
        `${b.client?.firstName ?? ''} ${b.client?.lastName ?? ''}`.toLowerCase().includes(kw) ||
        (b.vehicule?.immatriculation ?? '').toLowerCase().includes(kw)
      );
    }
    if (this.dateDebut) {
      data = data.filter(b => b.date && b.date >= this.dateDebut);
    }
    if (this.dateFin) {
      data = data.filter(b => b.date && b.date.slice(0, 10) <= this.dateFin);
    }
    if (this.filterVehicule) {
      const vKw = this.filterVehicule.toLowerCase();
      data = data.filter(b =>
        (b.vehicule?.immatriculation ?? '').toLowerCase().includes(vKw) ||
        (b.vehicule?.marque ?? '').toLowerCase().includes(vKw) ||
        (b.vehicule?.modele ?? '').toLowerCase().includes(vKw)
      );
    }
    this.filtered = data;
  }

  // onSearch is inherited from BasePaginatedComponent

  get paged(): BonDeSortie[] { return this.filtered; }

  onStatutFilter(event: Event) {
    this.filterStatut = (event.target as HTMLSelectElement).value;
    this.page = 1;
    this.applyFilter(); this.cdr.markForCheck();
  }

  // ── WIZARD ─────────────────────────────────────────────────────

  openCreate(context: Record<string, any> = {}) {
    this.form.reset({ remarque: '' });
    this.lignesPieces = [];
    this.piecePdpAjouter = null;
    this.piecePdgAjouter = null;
    this.piecePdsDesignationAjouter = '';
    this.mainDoeuvreAjouter = null;
    this.contextOrdreReparationId = context['ordreReparationId'] ? Number(context['ordreReparationId']) : null;
    this.contextOrdreTravailId = context['ordreTravailId'] ? Number(context['ordreTravailId']) : null;
    this.returnToContext = context['returnTo'] === 'proforma' ? 'proforma' : null;
    this.quantitesPrevues.clear();
    this.quantitesDejaSorties.clear();
    this.chargementsContexteEnCours = 0;
    this.chargementQuantitesOR = false;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.qteAjouterPdg = 1;
    this.prixAjouterPdg = null;
    this.qteAjouterPds = 1;
    this.prixAjouterPds = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
    this.selectedClient = null;
    this.vehiculesFiltres = [];
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.errorMessage = '';
    this.showCreateModal = true;
    this.loadClients('');
    this.loadPdpPieces('', 'PDP');
    this.loadPdpPieces('', 'PDG');
    this.loadMainDoeuvres();
    if (this.contextOrdreReparationId) {
      this.chargementsContexteEnCours = 2;
      this.chargementQuantitesOR = true;
      this.ordreReparationService.getById(this.contextOrdreReparationId).pipe(finalize(() => this.finChargementContexte())).subscribe({
        next: ordre => {
          for (const ligne of ordre.lignesOrdreReparationPieces ?? []) {
            const key = ligne.piece?.id ? `piece:${ligne.piece.id}` : `pds:${(ligne.designationPds ?? '').trim().toLocaleLowerCase()}`;
            this.quantitesPrevues.set(key, ligne.quantite ?? 0);
          }
          for (const ligne of ordre.lignesOrdreReparationMainDoeuvres ?? []) {
            if (ligne.mainDoeuvre?.id) this.quantitesPrevues.set(`mo:${ligne.mainDoeuvre.id}`, ligne.nbreHeure ?? 0);
          }
          this.cdr.markForCheck();
        },
        error: () => { this.errorMessage = 'Impossible de charger les quantités prévues sur l’ordre de réparation.'; this.cdr.markForCheck(); }
      });
      this.bonService.getAll({ ordreReparationId: this.contextOrdreReparationId, page: 0, size: 1000 }).pipe(finalize(() => this.finChargementContexte())).subscribe({
        next: response => {
          for (const bon of extractContent<BonDeSortie>(response as any)) {
            for (const ligne of bon.lignesBonDeSortiePieces ?? []) {
              const key = ligne.type === 'MAIN_DOEUVRE' ? `mo:${ligne.mainDoeuvreId}`
                : ligne.piece?.id ? `piece:${ligne.piece.id}` : `pds:${(ligne.designation ?? '').trim().toLocaleLowerCase()}`;
              this.quantitesDejaSorties.set(key, (this.quantitesDejaSorties.get(key) ?? 0) + (ligne.quantite || 0));
            }
          }
          this.cdr.markForCheck();
        },
        error: () => { this.errorMessage = 'Impossible de charger les quantités déjà sorties pour cet ordre.'; this.cdr.markForCheck(); }
      });
    }
    if (context['clientId']) {
      this.clientService.getById(Number(context['clientId'])).subscribe(client => {
        this.selectedClient = client as unknown as UserModel;
        this.form.patchValue({ clientId: Number(context['clientId']) });
        this.vehiculeService.getByClient(Number(context['clientId'])).subscribe(vehicles => {
          this.vehiculesFiltres = extractContent<VehiculeModel>(vehicles as any);
          if (context['vehiculeId']) this.form.patchValue({ vehiculeId: Number(context['vehiculeId']) });
          this.cdr.markForCheck();
        });
      });
    }
  }

  private finChargementContexte(): void {
    this.chargementsContexteEnCours = Math.max(0, this.chargementsContexteEnCours - 1);
    this.chargementQuantitesOR = this.chargementsContexteEnCours > 0;
    this.cdr.markForCheck();
  }

  closeCreate() {
    this.showCreateModal = false;
    this.errorMessage = '';
    this.saving = false;
    this.lignesPieces = [];
    this.piecePdpAjouter = null;
    this.piecePdgAjouter = null;
    this.piecePdsDesignationAjouter = '';
    this.mainDoeuvreAjouter = null;
    this.contextOrdreReparationId = null;
    this.contextOrdreTravailId = null;
    this.returnToContext = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.qteAjouterPdg = 1;
    this.prixAjouterPdg = null;
    this.qteAjouterPds = 1;
    this.prixAjouterPds = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
    this.form.reset();
    this.selectedClient = null;
    this.vehiculesFiltres = [];
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  save() {
    const val = this.form.value as any;
    const ordreTravailId = this.contextOrdreTravailId;
    const ordreReparationId = this.contextOrdreReparationId;
    const returnToContext = this.returnToContext;
    const lignesPieces = this.lignesPieces.map(l => {
      return {
        pieceId: l.piece?.id ?? null,
        mainDoeuvreId: l.mainDoeuvre?.id ?? null,
        type: l.type,
        designation: l.designation,
        quantite: Number(l.quantite) || 1,
        prix: Number(l.prix) || 0,
        prixUnitaire: Number(l.prix) || 0
      };
    });

    if (lignesPieces.length === 0) {
      this.errorMessage = 'Ajoutez au moins une pièce ou une main-d’œuvre.';
      return;
    }

    const depassement = this.lignesPieces.find(l => l.type === 'PDP' && l.piece && (Number(l.quantite) || 0) > (l.piece.stockMagasin ?? 0));
    if (depassement) {
      this.errorMessage = `La quantité pour "${depassement.designation}" (${depassement.quantite}) dépasse le stock magasin disponible (${depassement.piece?.stockMagasin ?? 0}).`;
      return;
    }

    const quantiteInvalide = this.lignesPieces.find(l => (Number(l.quantite) || 0) <= 0);
    if (quantiteInvalide) {
      this.errorMessage = `La quantité pour "${quantiteInvalide.designation}" doit être supérieure à 0.`;
      return;
    }

    if (this.form.get('clientId')!.invalid || this.form.get('vehiculeId')!.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.cdr.markForCheck();

    this.bonService.creer({
      clientId: val.clientId,
      vehiculeId: val.vehiculeId,
      ordreReparationId: ordreReparationId ?? undefined,
      ordreTravailId: ordreTravailId ?? undefined,
      remarque: val.remarque,
      lignesPieces
    } as any).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Bon de sortie créé !');
        this.closeCreate();
        if (returnToContext === 'proforma') {
          this.router.navigate(['/app/proforma']);
        } else if (ordreTravailId) {
          this.router.navigate(['/app/ordres-travail', ordreTravailId, 'bon-sortie']);
        } else if (ordreReparationId) {
          this.router.navigate(['/app/ordres-reparation', ordreReparationId, 'bon-sortie']);
        } else {
          this.loadBons();
        }
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors de la création.';
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  openDetail(bon: BonDeSortie) {
    this.selectedBon = bon;
    this.showDetailModal = true;
    this.bonService.getById(bon.id).subscribe({
      next: (fullBon) => {
        if (fullBon) {
          this.selectedBon = fullBon;
          this.cdr.markForCheck();
        }
      },
      error: () => {}
    });
    this.loadHistorique(bon.id);
  }
  closeDetail() {
    this.showDetailModal = false;
    this.selectedBon = null;
    this.historique = [];
  }

  loadHistorique(bonId: number) {
    this.loadingHistorique = true;
    this.bonService.getHistorique(bonId).subscribe({
      next: (h) => { this.historique = h; this.loadingHistorique = false; },
      error: () => { this.loadingHistorique = false; }
    });
  }

  openValidateModal(bon: BonDeSortie): void {
    this.bonToValidate = bon;
    this.showValidateModal = true;
    this.validationDetails = [];
    this.prepareValidationDetails(bon);
    this.cdr.markForCheck();
  }

  closeValidateModal(): void {
    if (this.validating) return;
    this.showValidateModal = false;
    this.bonToValidate = null;
    this.validationDetails = [];
    this.cdr.markForCheck();
  }

  prepareValidationDetails(bon: BonDeSortie): void {
    if (!bon) return;
    this.loadingValidationDetails = true;

    const handleBonLines = (fullBon: BonDeSortie) => {
      const lignes = fullBon.lignesBonDeSortiePieces || [];
      if (lignes.length === 0) {
        this.validationDetails = [];
        this.loadingValidationDetails = false;
        this.cdr.markForCheck();
        return;
      }

      const promises = lignes.map((ligne: any) => {
        const pieceId = ligne.piece?.id || ligne.pieceId;
        const qte = Number(ligne.quantite) || 0;
        const ref = ligne.piece?.reference || '—';
        const desig = ligne.piece?.designation || ligne.designationPds || ref;

        if (pieceId && ligne.type === 'PDP') {
          return this.pieceService.getById(pieceId).toPromise().then(
            (p: any) => {
              const smAv = Number(p?.stockMagasin ?? ligne.piece?.stockMagasin ?? 0);
              const saAv = Number(p?.stockAtelier ?? ligne.piece?.stockAtelier ?? 0);
              return {
                pieceId,
                reference: p?.reference || ref,
                designation: p?.designation || desig,
                quantite: qte,
                stockMagasinAv: smAv,
                stockMagasinAp: smAv,
                stockAtelierAv: saAv,
                stockAtelierAp: Math.max(0, saAv - qte)
              };
            },
            () => ({
              pieceId,
              reference: ref,
              designation: desig,
              quantite: qte,
              stockMagasinAv: Number(ligne.piece?.stockMagasin ?? 0),
              stockMagasinAp: Number(ligne.piece?.stockMagasin ?? 0),
              stockAtelierAv: Number(ligne.piece?.stockAtelier ?? 0),
              stockAtelierAp: Math.max(0, Number(ligne.piece?.stockAtelier ?? 0) - qte)
            })
          );
        }

        return Promise.resolve({
          pieceId: 0,
          reference: ref,
          designation: desig,
          quantite: qte,
          stockMagasinAv: 0,
          stockMagasinAp: 0,
          stockAtelierAv: 0,
          stockAtelierAp: 0
        });
      });

      Promise.all(promises).then((details) => {
        this.validationDetails = details;
        this.loadingValidationDetails = false;
        this.cdr.markForCheck();
      });
    };

    if (!bon.lignesBonDeSortiePieces || bon.lignesBonDeSortiePieces.length === 0) {
      this.bonService.getById(bon.id).subscribe({
        next: (full) => {
          this.bonToValidate = full;
          handleBonLines(full);
        },
        error: () => {
          this.loadingValidationDetails = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      handleBonLines(bon);
    }
  }

  confirmValider(): void {
    if (!this.bonToValidate || this.validating) return;
    this.validating = true;
    const bon = this.bonToValidate;

    this.bonService.valider(bon.id).subscribe({
      next: () => {
        this.validating = false;
        this.showValidateModal = false;
        this.bonToValidate = null;
        this.showSuccess(`Bon ${bon.reference} validé avec succès ! Sortie atelier effectuée.`);
        this.loadBons();
        if (this.selectedBon?.id === bon.id) {
          this.closeDetail();
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.validating = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors de la validation.';
        this.cdr.markForCheck();
      }
    });
  }

  valider(bon: BonDeSortie): void {
    this.openValidateModal(bon);
  }

  openRetourPieceModal(ligne: any): void {
    this.pieceToReturn = {
      id: ligne.id || ligne.piece?.id,
      pieceId: ligne.piece?.id,
      reference: ligne.piece?.reference || '—',
      designation: ligne.piece?.designation || ligne.designationPds || '',
      quantite: ligne.quantite || 0
    };
    this.showReturnPieceModal = true;
    this.cdr.markForCheck();
  }

  closeRetourPieceModal(): void {
    if (this.returningPiece) return;
    this.showReturnPieceModal = false;
    this.pieceToReturn = null;
    this.cdr.markForCheck();
  }

  confirmRetourPiece(): void {
    if (!this.selectedBon || !this.pieceToReturn || this.returningPiece) return;
    this.returningPiece = true;
    const pieceId = this.pieceToReturn.pieceId || this.pieceToReturn.id;

    this.bonService.retournerPiece(this.selectedBon.id, pieceId).subscribe({
      next: (updatedBon) => {
        this.returningPiece = false;
        this.showReturnPieceModal = false;
        this.pieceToReturn = null;
        this.selectedBon = updatedBon;
        this.showSuccess('Pièce retournée avec succès au stock magasin.');
        this.loadBons();
        this.loadHistorique(updatedBon.id);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.returningPiece = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors du retour de pièce.';
        this.cdr.markForCheck();
      }
    });
  }

  retournerPiece(pieceId: number, ligne?: any): void {
    if (ligne) {
      this.openRetourPieceModal(ligne);
    } else {
      const found = this.selectedBon?.lignesBonDeSortiePieces?.find((l: any) => l.piece?.id === pieceId || l.id === pieceId);
      if (found) {
        this.openRetourPieceModal(found);
      } else {
        this.pieceToReturn = { pieceId, id: pieceId, reference: 'Pièce #' + pieceId, quantite: 1 };
        this.showReturnPieceModal = true;
        this.cdr.markForCheck();
      }
    }
  }

  statutClass(statut: string): string {
    return statut === 'VALIDE' ? 'bg-oas-ok-bg text-oas-ok' : 'bg-oas-warn-bg text-oas-warn';
  }

  statutHistoriqueClass(statut?: string): string {
    switch (statut) {
      case 'SORTIE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SORTIE ATELIER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RETOUR':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  getNombreTotalPieces(bon: BonDeSortie): number {
    if (!bon.lignesBonDeSortiePieces || bon.lignesBonDeSortiePieces.length === 0) return 0;
    return bon.lignesBonDeSortiePieces.reduce((sum, l) => sum + (l.type === 'MAIN_DOEUVRE' ? 0 : (Number(l.quantite) || 0)), 0);
  }

  get totalPiecesSelectedBon(): number {
    return this.selectedBon ? this.getNombreTotalPieces(this.selectedBon) : 0;
  }

  get totalSelectedBon(): number {
    if (this.selectedBon?.montantTotal != null) return this.selectedBon.montantTotal;
    if (!this.selectedBon?.lignesBonDeSortiePieces) return 0;
    return this.selectedBon.lignesBonDeSortiePieces.reduce((sum, l) => {
      const price = this.getLignePrix(l);
      return sum + price * (Number(l.quantite) || 0);
    }, 0);
  }

  getLignePrix(l: any): number {
    if (!l) return 0;
    if (l.prix != null && l.prix !== '') return Number(l.prix);
    if (l.prixUnitaire != null && l.prixUnitaire !== '') return Number(l.prixUnitaire);
    if (l.piece?.prix != null && l.piece?.prix !== '') return Number(l.piece.prix);
    return 0;
  }

  getLigneTotal(l: any): number {
    return this.getLignePrix(l) * (Number(l?.quantite) || 0);
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR');
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.markForCheck();
    }, 3500);
  }
}
