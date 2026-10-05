import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BonDeSortieService } from './bon-de-sortie.service';
import { BonDeSortie, BonDeSortieHistorique } from './models/bon-de-sortie.model';
import { ClientService } from '../clients/client.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { PieceDetacheeService } from '../pieces-detachees/piece-detachee.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { UserModel, VehiculeModel, PieceDetache, extractContent } from '../../shared/models';
import { LucidePlus, LucideSearch, LucideTrash2, LucideX, LucideCheck, LucideCheckCircle, LucideLoader2, LucideUser, LucideCar, LucideClock, LucidePackage, LucideFileText } from '@lucide/angular';

export interface LignePieceBS {
  piece: PieceDetache;
  quantite: number;
  prix?: number | null;
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
  private bonService = inject(BonDeSortieService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private authService = inject(AuthService);

  bons: BonDeSortie[] = [];
  filtered: BonDeSortie[] = [];

  clients: UserModel[] = [];
  vehiculesFiltres: VehiculeModel[] = [];
  piecesPdp: PieceDetache[] = [];
  lignesPieces: LignePieceBS[] = [];

  piecePdpAjouter: number | null = null;
  qteAjouterPdp = 1;
  prixAjouterPdp: number | null = null;

  loading = false;
  saving = false;
  loadingVehicules = false;
  loadingPdp = false;
  successMessage = '';
  errorMessage = '';

  private pdpSearchDebounce: any;

  historique: BonDeSortieHistorique[] = [];
  loadingHistorique = false;

  showCreateModal = false;
  showDetailModal = false;
  selectedBon: BonDeSortie | null = null;

  createStep = 1;

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
  get canCreate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT', 'ROLE_AGENT_MAGASIN'].includes(this.role); }
  get canValidate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'].includes(this.role); }

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

  loadPdpPieces(keyword: string = '') {
    this.loadingPdp = true;
    const params: any = { page: 0, size: 10, type: 'PDP' };
    if (keyword && keyword.trim()) {
      params.keyword = keyword.trim();
    }
    this.pieceService.getAll(params).subscribe({
      next: (res) => {
        this.piecesPdp = extractContent<PieceDetache>(res as any).filter(p => p.statut === 'ACTIF');
        this.loadingPdp = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPdp = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPdpSearch(term: string) {
    clearTimeout(this.pdpSearchDebounce);
    this.pdpSearchDebounce = setTimeout(() => {
      this.loadPdpPieces(term);
    }, 300);
  }

  get lignesPiecesPdp(): LignePieceBS[] {
    return this.lignesPieces.filter(l => l.piece.type === 'PDP');
  }

  get totalPdp(): number {
    return this.lignesPiecesPdp.reduce((sum, l) => {
      const price = l.prix != null && l.prix !== ('' as any) ? Number(l.prix) : (l.piece?.prix != null ? Number(l.piece.prix) : 0);
      return sum + (price * (Number(l.quantite) || 0));
    }, 0);
  }

  get totalGeneral(): number {
    return this.totalPdp;
  }

  formatPiece = (p: PieceDetache) => {
    const stock = p.stockMagasin != null ? `(Stock: ${p.stockMagasin})` : '';
    const prix = p.prix != null ? `— ${p.prix} FCFA` : '';
    return `${p.reference} — ${p.designation} ${prix} ${stock}`.trim();
  };

  get selectedPiecePdp(): PieceDetache | undefined {
    if (!this.piecePdpAjouter) return undefined;
    return this.piecesPdp.find(p => p.id === Number(this.piecePdpAjouter));
  }

  onPiecePdpSelected(pieceId: any) {
    if (!pieceId) {
      this.prixAjouterPdp = null;
      return;
    }
    const p = this.piecesPdp.find(x => x.id === +pieceId);
    if (p) {
      this.prixAjouterPdp = p.prix != null ? Number(p.prix) : null;
      this.qteAjouterPdp = 1;
      this.errorMessage = '';
    }
  }

  addPiecePdp() {
    this.errorMessage = '';
    if (!this.piecePdpAjouter) return;
    const piece = this.piecesPdp.find(p => p.id === Number(this.piecePdpAjouter));
    if (!piece) return;

    const stock = piece.stockMagasin ?? 0;
    if (stock <= 0) {
      this.errorMessage = `La pièce "${piece.designation || piece.reference}" est en rupture de stock magasin (0 disponible).`;
      return;
    }

    const qteDemandee = Number(this.qteAjouterPdp) || 1;
    if (qteDemandee <= 0) {
      this.errorMessage = 'La quantité doit être supérieure à 0.';
      return;
    }

    const existing = this.lignesPieces.find(l => l.piece.id === piece.id);
    const currentQte = existing ? (Number(existing.quantite) || 0) : 0;

    if (currentQte + qteDemandee > stock) {
      this.errorMessage = `Stock magasin insuffisant pour "${piece.designation || piece.reference}" : seulement ${stock} disponible(s) (${currentQte} déjà ajouté(s)).`;
      return;
    }

    const prix = this.prixAjouterPdp != null && this.prixAjouterPdp !== ('' as any)
      ? Number(this.prixAjouterPdp)
      : (piece.prix != null ? Number(piece.prix) : 0);

    if (existing) {
      existing.quantite = currentQte + qteDemandee;
      if (this.prixAjouterPdp != null && this.prixAjouterPdp !== ('' as any)) {
        existing.prix = Number(this.prixAjouterPdp);
      }
    } else {
      this.lignesPieces.push({
        piece,
        quantite: qteDemandee,
        prix: prix
      });
    }
    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.cdr.markForCheck();
  }

  onLineQteChange(l: LignePieceBS) {
    const stock = l.piece.stockMagasin ?? 0;
    const qte = Number(l.quantite) || 0;
    if (qte > stock) {
      this.errorMessage = `Attention : la quantité pour "${l.piece.designation || l.piece.reference}" (${qte}) dépasse le stock magasin disponible (${stock}).`;
    } else if (qte <= 0) {
      this.errorMessage = `La quantité pour "${l.piece.designation || l.piece.reference}" doit être au moins de 1.`;
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
        this.openCreate();
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

  openCreate() {
    this.form.reset({ remarque: '' });
    this.lignesPieces = [];
    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.selectedClient = null;
    this.vehiculesFiltres = [];
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.createStep = 1;
    this.errorMessage = '';
    this.showCreateModal = true;
    this.loadClients('');
    this.loadPdpPieces('');
  }

  closeCreate() { this.showCreateModal = false; this.errorMessage = ''; this.createStep = 1; }

  goStep(n: number) {
    if (n === 2) {
      if (this.form.get('clientId')!.invalid || this.form.get('vehiculeId')!.invalid) {
        this.form.get('clientId')!.markAsTouched();
        this.form.get('vehiculeId')!.markAsTouched();
        this.errorMessage = 'Veuillez sélectionner un client et un véhicule.';
        return;
      }
    }
    this.createStep = n;
    this.errorMessage = '';
  }

  save() {
    const val = this.form.value as any;
    const lignesPieces = this.lignesPieces.map(l => {
      const price = l.prix != null && l.prix !== ('' as any)
        ? Number(l.prix)
        : (l.piece?.prix != null ? Number(l.piece.prix) : null);
      return {
        pieceId: l.piece.id,
        quantite: Number(l.quantite) || 1,
        prix: price,
        prixUnitaire: price
      };
    });

    if (lignesPieces.length === 0) {
      this.errorMessage = 'Ajoutez au moins une pièce de rechange (PDP).';
      return;
    }

    const depassement = this.lignesPieces.find(l => (Number(l.quantite) || 0) > (l.piece.stockMagasin ?? 0));
    if (depassement) {
      this.errorMessage = `La quantité pour "${depassement.piece.designation || depassement.piece.reference}" (${depassement.quantite}) dépasse le stock magasin disponible (${depassement.piece.stockMagasin ?? 0}).`;
      return;
    }

    const quantiteInvalide = this.lignesPieces.find(l => (Number(l.quantite) || 0) <= 0);
    if (quantiteInvalide) {
      this.errorMessage = `La quantité pour "${quantiteInvalide.piece.designation || quantiteInvalide.piece.reference}" doit être supérieure à 0.`;
      return;
    }

    if (this.form.get('clientId')!.invalid || this.form.get('vehiculeId')!.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;

    this.bonService.creer({
      clientId: val.clientId,
      vehiculeId: val.vehiculeId,
      remarque: val.remarque,
      lignesPieces
    } as any).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Bon de sortie créé !');
        this.closeCreate();
        this.loadBons();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors de la création.';
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

  retournerPiece(pieceId: number) {
    if (!this.selectedBon) return;
    if (!confirm('Voulez-vous retirer cette pièce du bon de sortie ? La quantité sera recréditée au stock magasin.')) return;
    if (this.saving) return;
    this.saving = true;
    this.bonService.retournerPiece(this.selectedBon.id, pieceId).subscribe({
      next: (updatedBon) => {
        this.saving = false;
        this.selectedBon = updatedBon;
        this.showSuccess('Pièce retournée avec succès au stock magasin.');
        this.loadBons();
        this.loadHistorique(updatedBon.id);
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors du retour de pièce.';
      }
    });
  }

  valider(bon: BonDeSortie) {
    if (!confirm(`Valider le bon ${bon.reference} ? Les pièces seront déduites de l'atelier.`)) return;
    if (this.saving) return;
    this.saving = true;
    this.bonService.valider(bon.id).subscribe({
      next: () => { this.saving = false; this.showSuccess(`Bon ${bon.reference} validé !`); this.loadBons(); this.closeDetail(); },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors de la validation.';
      }
    });
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
    return bon.lignesBonDeSortiePieces.reduce((sum, l) => sum + (Number(l.quantite) || 0), 0);
  }

  get totalPiecesSelectedBon(): number {
    return this.selectedBon ? this.getNombreTotalPieces(this.selectedBon) : 0;
  }

  get totalSelectedBon(): number {
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
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }
}
