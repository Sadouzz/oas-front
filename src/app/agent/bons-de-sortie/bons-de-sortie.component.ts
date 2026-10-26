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
import { OrdreTravailService } from '../ordres-travail/ordre-travail.service';
import { OrdreTravail } from '../ordres-travail/models/ordre-travail.model';
import { ProformaService } from '../proforma/proforma.service';
import { Proforma } from '../proforma/models/proforma.model';
import { AuthService } from '../../core/services/auth.service';
import { FiscalConfigurationService } from '../gestion-tva/fiscal-configuration.service';
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
  tauxRemise?: number;
  horsProforma?: boolean;
  dejaSortieProforma?: boolean;
  depassementProforma?: boolean;
  qteProforma?: number;
  dejaSortie?: number;
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
  cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bonService = inject(BonDeSortieService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private mainDoeuvreService = inject(MainDoeuvreService);
  private ordreReparationService = inject(OrdreReparationService);
  private proformaService = inject(ProformaService);
  private otService = inject(OrdreTravailService);
  private authService = inject(AuthService);
  private fiscalConfigurationService = inject(FiscalConfigurationService);
  tvaRate = 18;
  appliquerTVA = false;

  proformaContexte: Proforma | null = null;
  piecesProformaSet = new Set<string>();
  quantitesProforma = new Map<string, number>();
  remisesProforma = new Map<string, number>();

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
  contextOrdreReparationNumero: string | null = null;
  contextOrdreTravailId: number | null = null;
  contextOrdreTravailNumero: string | null = null;
  selectedOrdreTravailId: number | null = null;
  ordresTravailFiltres: OrdreTravail[] = [];
  loadingOrdresTravail = false;
  private ordresTravailLoadVersion = 0;
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
    // Si un OT existe, sa fin effective est la condition de validation.
    // Le statut OR reste le repli historique pour les anciens BS sans OT.
    const reparationTerminee = bon.ordreTravailId
      ? bon.ordreTravailStatut === 'TERMINE'
      : ['PAIEMENT', 'PRET_A_LIVRER', 'LIVRE'].includes(bon.ordreReparationStatut ?? '');
    return this.canValidate && reparationTerminee;
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

  montantLignePieceNet(ligne: LignePieceBS): number {
    const brut = (Number(ligne.quantite) || 0) * (Number(ligne.prix) || 0);
    return this.arrondirMontant(brut * (1 - this.tauxRemiseLigne(ligne.tauxRemise) / 100));
  }

  montantRemisePiece(ligne: LignePieceBS): number {
    return this.arrondirMontant((Number(ligne.quantite) || 0) * (Number(ligne.prix) || 0) - this.montantLignePieceNet(ligne));
  }

  tauxRemiseLigne(taux: number | undefined): number {
    const valeur = Number(taux) || 0;
    return Math.max(0, Math.min(100, valeur));
  }

  arrondirMontant(montant: number): number {
    return Math.round((montant + Number.EPSILON) * 100) / 100;
  }

  fmt(val: number | null | undefined): string {
    if (val == null) return '0';
    return Math.round(val).toLocaleString('fr-FR');
  }

  onRemiseGeneraleChange(): void {
    this.cdr.markForCheck();
  }

  get totalPdp(): number {
    return this.lignesPdp.reduce((sum, l) => sum + this.montantLignePieceNet(l), 0);
  }

  get totalGeneral(): number {
    return this.lignesPieces.reduce((sum, l) => sum + this.montantLignePieceNet(l), 0);
  }

  get montantTVAForm(): number { return this.appliquerTVA ? Math.round(this.totalGeneral * this.tvaRate / 100) : 0; }
  get montantTTCForm(): number { return this.totalGeneral + this.montantTVAForm; }

  get totalBrut(): number {
    return this.lignesPieces.reduce((sum, l) => sum + ((Number(l.quantite) || 0) * (Number(l.prix) || 0)), 0);
  }

  get totalRemise(): number {
    return this.lignesPieces.reduce((sum, l) => sum + this.montantRemisePiece(l), 0);
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

  getPieceStatusInfo(
    type: TypePieceBS | 'PDS' | 'MAIN_DOEUVRE',
    piece: PieceDetache | null | undefined,
    designation: string,
    quantiteSaisie: number
  ): {
    isHorsProforma: boolean;
    isDejaSortiComplet: boolean;
    isDepassement: boolean;
    qteProforma: number;
    dejaSorti: number;
    message: string;
  } {
    if (!this.contextOrdreReparationId && !this.contextOrdreTravailId) {
      return { isHorsProforma: false, isDejaSortiComplet: false, isDepassement: false, qteProforma: 0, dejaSorti: 0, message: '' };
    }

    const key = type === 'MAIN_DOEUVRE' && piece?.id
      ? `mo:${piece.id}`
      : piece?.id
        ? `piece:${piece.id}`
        : `pds:${(designation || '').trim().toLowerCase()}`;

    const hasProformaData = this.piecesProformaSet.size > 0 || this.quantitesPrevues.size > 0;
    const isDansProforma = this.piecesProformaSet.has(key) || this.quantitesPrevues.has(key);

    if (hasProformaData && !isDansProforma) {
      return {
        isHorsProforma: true,
        isDejaSortiComplet: false,
        isDepassement: false,
        qteProforma: 0,
        dejaSorti: 0,
        message: 'Cette pièce n\'est pas dans le proforma validé pour cet ordre.'
      };
    }

    const qteProforma = this.quantitesProforma.get(key) ?? this.quantitesPrevues.get(key) ?? 0;
    const dejaSorti = this.quantitesDejaSorties.get(key) ?? 0;
    const dejaAjoute = this.lignesPieces
      .filter(l => this.cleLigne(l) === key)
      .reduce((sum, l) => sum + (Number(l.quantite) || 0), 0);

    if (qteProforma > 0 && dejaSorti >= qteProforma) {
      return {
        isHorsProforma: false,
        isDejaSortiComplet: true,
        isDepassement: true,
        qteProforma,
        dejaSorti,
        message: `Vous avez déjà sorti le nombre de pièces nécessaires qui était sur le proforma (${dejaSorti}/${qteProforma} sortie(s)).`
      };
    }

    if (qteProforma > 0 && (dejaSorti + dejaAjoute + quantiteSaisie) > qteProforma) {
      return {
        isHorsProforma: false,
        isDejaSortiComplet: false,
        isDepassement: true,
        qteProforma,
        dejaSorti,
        message: `Attention : cette quantité (${dejaSorti + dejaAjoute + quantiteSaisie}) dépasse les ${qteProforma} pièce(s) prévue(s) sur le proforma (déjà sorti : ${dejaSorti}).`
      };
    }

    return { isHorsProforma: false, isDejaSortiComplet: false, isDepassement: false, qteProforma, dejaSorti, message: '' };
  }

  get infoPiecePdpSelectionnee() {
    if (!this.piecePdpAjouter) return null;
    const p = this.findSelectedPiece('PDP');
    if (!p) return null;
    return this.getPieceStatusInfo('PDP', p, p.designation, Number(this.qteAjouterPdp) || 1);
  }

  get infoPiecePdgSelectionnee() {
    if (!this.piecePdgAjouter) return null;
    const p = this.findSelectedPiece('PDG');
    if (!p) return null;
    return this.getPieceStatusInfo('PDG', p, p.designation, Number(this.qteAjouterPdg) || 1);
  }

  get infoPiecePdsSaisie() {
    if (!this.piecePdsDesignationAjouter || !this.piecePdsDesignationAjouter.trim()) return null;
    return this.getPieceStatusInfo('PDS', null, this.piecePdsDesignationAjouter, Number(this.qteAjouterPds) || 1);
  }

  get hasLignesHorsProforma(): boolean {
    return this.lignesPieces.some(l => l.horsProforma);
  }

  get hasLignesDepassementProforma(): boolean {
    return this.lignesPieces.some(l => l.depassementProforma || l.dejaSortieProforma);
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
    const info = this.getPieceStatusInfo(type, piece, piece.designation, qteDemandee);
    const remiseKey = piece ? `piece:${piece.id}` : '';
    const tauxRemise = this.remisesProforma.get(remiseKey) ?? 0;
    this.lignesPieces.push({
      type,
      piece,
      designation: piece.designation,
      quantite: qteDemandee,
      prix,
      tauxRemise,
      horsProforma: info.isHorsProforma,
      dejaSortieProforma: info.isDejaSortiComplet,
      depassementProforma: info.isDepassement,
      qteProforma: info.qteProforma,
      dejaSortie: info.dejaSorti
    });

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
    const info = this.getPieceStatusInfo('PDS', null, designation, quantite);
    const remiseKey = `pds:${designation.toLowerCase()}`;
    const tauxRemise = this.remisesProforma.get(remiseKey) ?? 0;
    this.lignesPieces.push({
      type: 'PDS',
      designation,
      quantite,
      prix: Number(this.prixAjouterPds) || 0,
      tauxRemise,
      horsProforma: info.isHorsProforma,
      dejaSortieProforma: info.isDejaSortiComplet,
      depassementProforma: info.isDepassement,
      qteProforma: info.qteProforma,
      dejaSortie: info.dejaSorti
    });
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
    const info = this.getPieceStatusInfo('MAIN_DOEUVRE', mo as any, mo.description, qte);
    const remiseKey = `mo:${mo.id}`;
    const tauxRemise = this.remisesProforma.get(remiseKey) ?? 0;
    this.lignesPieces.push({
      type: 'MAIN_DOEUVRE',
      mainDoeuvre: mo,
      designation: mo.description,
      quantite: qte,
      prix: Number(this.prixAjouterMO ?? mo.prix),
      tauxRemise,
      horsProforma: info.isHorsProforma,
      dejaSortieProforma: info.isDejaSortiComplet,
      depassementProforma: info.isDepassement,
      qteProforma: info.qteProforma,
      dejaSortie: info.dejaSorti
    });
    this.mainDoeuvreAjouter = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
    this.cdr.markForCheck();
  }

  onLineQteChange(l: LignePieceBS) {
    if (l.type !== 'PDP' || !l.piece) {
      this.errorMessage = Number(l.quantite) > 0 ? '' : 'La quantité doit être supérieure à zéro.';
    } else {
      const stock = l.piece.stockMagasin ?? 0;
      const qte = Number(l.quantite) || 0;
      if (qte > stock) {
        this.errorMessage = `Attention : la quantité pour "${l.designation}" (${qte}) dépasse le stock magasin disponible (${stock}).`;
      } else if (qte <= 0) {
        this.errorMessage = `La quantité pour "${l.designation}" doit être au moins de 1.`;
      } else {
        this.errorMessage = '';
      }
    }

    const info = this.getPieceStatusInfo(l.type, l.piece, l.designation, Number(l.quantite) || 0);
    l.horsProforma = info.isHorsProforma;
    l.dejaSortieProforma = info.isDejaSortiComplet;
    l.depassementProforma = info.isDepassement;
    l.qteProforma = info.qteProforma;
    l.dejaSortie = info.dejaSorti;
    this.cdr.markForCheck();
  }

  incrementPiece(l: LignePieceBS): void {
    l.quantite = (Number(l.quantite) || 0) + 1;
    this.onLineQteChange(l);
  }

  decrementPiece(l: LignePieceBS): void {
    if ((Number(l.quantite) || 0) > 1) {
      l.quantite = (Number(l.quantite) || 0) - 1;
      this.onLineQteChange(l);
    }
  }

  removePiece(item: LignePieceBS) {
    this.lignesPieces = this.lignesPieces.filter(l => l !== item);
    this.errorMessage = '';
    this.cdr.markForCheck();
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

  formatOrdreTravail = (ot: OrdreTravail): string => {
    if (!ot) return '';
    const num = ot.numero || `OT #${ot.id}`;
    const orRef = ot.ordreReparationNumero ? ` (OR: ${ot.ordreReparationNumero})` : '';
    const statut = ot.statut ? ` — ${ot.statut}` : '';
    return `${num}${orRef}${statut}`;
  };

  get selectedOrdreTravail(): OrdreTravail | null {
    const id = this.selectedOrdreTravailId || this.contextOrdreTravailId;
    if (!id) return null;
    return this.ordresTravailFiltres.find(o => o.id == id) || null;
  }

  selectClient(c: UserModel) {
    this.ordresTravailLoadVersion++;
    this.selectedClient = c;
    this.form.patchValue({ clientId: c.id, vehiculeId: null });
    this.vehiculesFiltres = [];
    this.clientFilter = '';
    this.clientOpen = false;
    this.selectedOrdreTravailId = null;
    this.contextOrdreTravailId = null;
    this.contextOrdreTravailNumero = null;
    this.contextOrdreReparationId = null;
    this.contextOrdreReparationNumero = null;
    this.ordresTravailFiltres = [];
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
    this.selectedOrdreTravailId = null;
    this.contextOrdreTravailId = null;
    this.contextOrdreTravailNumero = null;
    this.contextOrdreReparationId = null;
    this.contextOrdreReparationNumero = null;
    this.loadOrdresTravailPourVehicule(v.id);
    this.cdr.markForCheck();
  }

  loadOrdresTravailPourVehicule(vehiculeId?: number | null, ordreTravailId?: number | null) {
    const loadVersion = ++this.ordresTravailLoadVersion;
    this.loadingOrdresTravail = true;
    const targetOtId = ordreTravailId || this.contextOrdreTravailId || this.selectedOrdreTravailId;
    const selectedVehiculeId = Number(vehiculeId || this.form.get('vehiculeId')?.value || 0);
    const selectedClientId = Number(this.form.get('clientId')?.value || 0);

    if (!selectedVehiculeId || !selectedClientId) {
      this.ordresTravailFiltres = [];
      this.loadingOrdresTravail = false;
      this.cdr.markForCheck();
      return;
    }

    const belongsToSelection = (ot: OrdreTravail): boolean => {
      const otVehiculeId = Number(ot.vehiculeId ?? ot.vehicule?.id ?? 0);
      const otClientId = Number((ot as any).clientId || ot.client?.id || ot.vehicule?.client?.id || 0);
      return otVehiculeId === selectedVehiculeId && otClientId === selectedClientId;
    };

    const applyOptions = (options: OrdreTravail[]) => {
      if (loadVersion !== this.ordresTravailLoadVersion) return;
      if (Number(this.form.get('clientId')?.value || 0) !== selectedClientId
          || Number(this.form.get('vehiculeId')?.value || 0) !== selectedVehiculeId) return;
      this.ordresTravailFiltres = options;
      this.loadingOrdresTravail = false;

      const target = targetOtId ? Number(targetOtId) : null;
      const found = target ? options.find(ot => ot.id === target) : null;
      if (target) {
        this.selectedOrdreTravailId = found?.id ?? null;
        this.contextOrdreTravailId = found?.id ?? null;
        this.contextOrdreTravailNumero = found?.numero || (found ? `OT #${found.id}` : null);
        if (found?.ordreReparationId) {
          this.contextOrdreReparationId = found.ordreReparationId;
          this.contextOrdreReparationNumero = found.ordreReparationNumero || null;
        } else if (!found) {
          this.contextOrdreReparationId = null;
          this.contextOrdreReparationNumero = null;
        }
      }
      this.cdr.markForCheck();
    };

    this.otService.getAll({ size: 1000 }).subscribe({
      next: (res) => {
        const matches = extractContent<OrdreTravail>(res as any).filter(belongsToSelection);
        if (!targetOtId || matches.some(ot => ot.id === Number(targetOtId))) {
          applyOptions(matches);
          return;
        }

        this.otService.getById(Number(targetOtId)).subscribe({
          next: specificOt => {
            if (loadVersion !== this.ordresTravailLoadVersion) return;
            if (specificOt && belongsToSelection(specificOt)) matches.unshift(specificOt);
            applyOptions(matches);
          },
          error: () => applyOptions(matches)
        });
      },
      error: () => {
        if (loadVersion !== this.ordresTravailLoadVersion) return;
        this.ordresTravailFiltres = [];
        this.loadingOrdresTravail = false;
        this.cdr.markForCheck();
      }
    });
  }

  onOrdreTravailSelected(otId: number | null): void {
    this.selectedOrdreTravailId = otId ? Number(otId) : null;
    this.contextOrdreTravailId = this.selectedOrdreTravailId;

    if (!otId) {
      this.contextOrdreTravailNumero = null;
      this.contextOrdreReparationId = null;
      this.contextOrdreReparationNumero = null;
      this.proformaContexte = null;
      this.piecesProformaSet.clear();
      this.quantitesProforma.clear();
      this.remisesProforma.clear();
      this.quantitesPrevues.clear();
      this.quantitesDejaSorties.clear();
      this.cdr.markForCheck();
      return;
    }

    const ot = this.ordresTravailFiltres.find(o => o.id === Number(otId));
    if (ot) {
      this.contextOrdreTravailNumero = ot.numero || `OT #${ot.id}`;
      if (ot.ordreReparationId) {
        this.contextOrdreReparationId = ot.ordreReparationId;
        this.contextOrdreReparationNumero = ot.ordreReparationNumero || null;
      }
      if (!this.form.get('clientId')?.value && ot.client?.id) {
        this.form.patchValue({ clientId: ot.client.id });
      }
    }

    this.chargerContexteOrdre(this.contextOrdreReparationId, this.contextOrdreTravailId);
  }

  chargerContexteOrdre(orId: number | null, otId: number | null): void {
    if (orId) {
      this.chargementsContexteEnCours = 3;
      this.chargementQuantitesOR = true;
      this.ordreReparationService.getById(orId).pipe(finalize(() => this.finChargementContexte())).subscribe({
        next: ordre => {
          if (!this.contextOrdreReparationNumero && ordre.numero) {
            this.contextOrdreReparationNumero = ordre.numero;
          }
          if (!this.form.get('clientId')?.value && ordre.vehicule?.client?.id) {
            const cId = ordre.vehicule.client.id;
            this.clientService.getById(cId).subscribe(client => {
              this.selectedClient = client as unknown as UserModel;
              this.form.patchValue({ clientId: cId });
              this.vehiculeService.getByClient(cId).subscribe(vehicles => {
                this.vehiculesFiltres = extractContent<VehiculeModel>(vehicles as any);
                if (ordre.vehicule?.id) {
                  this.form.patchValue({ vehiculeId: ordre.vehicule.id });
                  this.loadOrdresTravailPourVehicule(ordre.vehicule.id, this.contextOrdreTravailId);
                }
                this.cdr.markForCheck();
              });
            });
          }
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

      this.proformaService.getByOrdreReparationId(orId).pipe(finalize(() => this.finChargementContexte())).subscribe({
        next: proforma => {
          this.proformaContexte = proforma;
          for (const ligne of proforma.lignesPieces ?? []) {
            const key = ligne.pieceId
              ? `piece:${ligne.pieceId}`
              : (ligne.piece?.id ? `piece:${ligne.piece.id}` : `pds:${(ligne.designationPds || ligne.designationPiece || '').trim().toLowerCase()}`);
            this.piecesProformaSet.add(key);
            this.quantitesProforma.set(key, (this.quantitesProforma.get(key) ?? 0) + (ligne.quantite || 0));
            if (!this.quantitesPrevues.has(key)) {
              this.quantitesPrevues.set(key, ligne.quantite || 0);
            }
            if (ligne.tauxRemise != null) {
              this.remisesProforma.set(key, Number(ligne.tauxRemise) || 0);
            }
          }
          for (const ligne of proforma.lignesMainDoeuvres ?? []) {
            if (ligne.mainDoeuvreId) {
              const key = `mo:${ligne.mainDoeuvreId}`;
              this.piecesProformaSet.add(key);
              this.quantitesProforma.set(key, (this.quantitesProforma.get(key) ?? 0) + (ligne.nbreHeure || 0));
              if (!this.quantitesPrevues.has(key)) {
                this.quantitesPrevues.set(key, ligne.nbreHeure || 0);
              }
              if (ligne.tauxRemise != null) {
                this.remisesProforma.set(key, Number(ligne.tauxRemise) || 0);
              }
            }
          }
          this.cdr.markForCheck();
        },
        error: () => {}
      });

      this.bonService.getAll({ ordreReparationId: orId, page: 0, size: 1000 }).pipe(finalize(() => this.finChargementContexte())).subscribe({
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

    if (otId) {
      this.otService.getStepRecapitulatif(Number(otId)).subscribe({
        next: (recap: any) => {
          if (recap?.proforma && !this.proformaContexte) {
            this.proformaContexte = recap.proforma;
            this.remplirQuantitesDepuisProforma(recap.proforma);
          }
          if (recap?.proformaId && !this.proformaContexte) {
            this.proformaService.getById(Number(recap.proformaId)).subscribe({
              next: pf => {
                this.proformaContexte = pf;
                this.remplirQuantitesDepuisProforma(pf);
                this.cdr.markForCheck();
              },
              error: () => {}
            });
          }
          this.cdr.markForCheck();
        },
        error: () => {}
      });

      this.otService.getStepBonSortie(otId).subscribe({
        next: step => {
          if (step.proformaId && !this.proformaContexte) {
            this.proformaService.getById(Number(step.proformaId)).subscribe({
              next: pf => {
                this.proformaContexte = pf;
                this.remplirQuantitesDepuisProforma(pf);
                this.cdr.markForCheck();
              },
              error: () => {}
            });
          }
          for (const p of step.piecesManquantesProforma ?? []) {
            const key = p.pieceId
              ? `piece:${p.pieceId}`
              : `pds:${(p.designation || '').trim().toLowerCase()}`;
            this.piecesProformaSet.add(key);
            this.quantitesProforma.set(key, (this.quantitesProforma.get(key) ?? 0) + (p.quantiteDemandee || 0));
            if (!this.quantitesPrevues.has(key)) {
              this.quantitesPrevues.set(key, p.quantiteDemandee || 0);
            }
          }
          this.cdr.markForCheck();
        },
        error: () => {}
      });
    }
  }

  private remplirQuantitesDepuisProforma(proforma: any): void {
    if (!proforma) return;
    const pieces = proforma.lignesPieces ?? proforma.pieces ?? [];
    for (const ligne of pieces) {
      const key = ligne.pieceId
        ? `piece:${ligne.pieceId}`
        : (ligne.piece?.id ? `piece:${ligne.piece.id}` : `pds:${(ligne.designationPds || ligne.designationPiece || ligne.nom || ligne.designation || '').trim().toLowerCase()}`);
      this.piecesProformaSet.add(key);
      this.quantitesProforma.set(key, (this.quantitesProforma.get(key) ?? 0) + (ligne.quantite || 0));
      if (!this.quantitesPrevues.has(key)) {
        this.quantitesPrevues.set(key, ligne.quantite || 0);
      }
      if (ligne.tauxRemise != null) {
        this.remisesProforma.set(key, Number(ligne.tauxRemise) || 0);
      }
    }
    const moList = proforma.lignesMainDoeuvres ?? proforma.lignesMainDoeuvre ?? [];
    for (const ligne of moList) {
      const id = ligne.mainDoeuvreId || ligne.id;
      if (id) {
        const key = `mo:${id}`;
        this.piecesProformaSet.add(key);
        this.quantitesProforma.set(key, (this.quantitesProforma.get(key) ?? 0) + (ligne.nbreHeure || 0));
        if (!this.quantitesPrevues.has(key)) {
          this.quantitesPrevues.set(key, ligne.nbreHeure || 0);
        }
        if (ligne.tauxRemise != null) {
          this.remisesProforma.set(key, Number(ligne.tauxRemise) || 0);
        }
      }
    }
  }

  importerLignesProforma(): void {
    const otId = this.selectedOrdreTravailId || this.contextOrdreTravailId;
    const orId = this.contextOrdreReparationId;

    if (!this.proformaContexte) {
      if (otId) {
        this.otService.getStepRecapitulatif(Number(otId)).subscribe({
          next: (recap: any) => {
            if (recap?.proforma) {
              this.proformaContexte = recap.proforma;
              this.remplirQuantitesDepuisProforma(recap.proforma);
              this.executerImportLignesProforma();
            } else if (recap?.proformaId) {
              this.proformaService.getById(Number(recap.proformaId)).subscribe({
                next: pf => {
                  this.proformaContexte = pf;
                  this.remplirQuantitesDepuisProforma(pf);
                  this.executerImportLignesProforma();
                },
                error: () => {
                  if (orId) this.chargerDepuisOrEtImporter(orId);
                }
              });
            } else if (orId) {
              this.chargerDepuisOrEtImporter(orId);
            }
          },
          error: () => {
            if (orId) this.chargerDepuisOrEtImporter(orId);
          }
        });
        return;
      } else if (orId) {
        this.chargerDepuisOrEtImporter(orId);
        return;
      }
    }

    this.executerImportLignesProforma();
  }

  private chargerDepuisOrEtImporter(orId: number): void {
    this.proformaService.getByOrdreReparationId(Number(orId)).subscribe({
      next: pf => {
        this.proformaContexte = pf;
        this.remplirQuantitesDepuisProforma(pf);
        this.executerImportLignesProforma();
      },
      error: () => {
        this.errorMessage = 'Impossible de récupérer le proforma lié.';
        this.cdr.markForCheck();
      }
    });
  }

  private executerImportLignesProforma(): void {
    if (!this.proformaContexte) return;
    const pieces = this.proformaContexte.lignesPieces ?? (this.proformaContexte as any).pieces ?? [];

    for (const rawLp of pieces) {
      const lp = rawLp as any;
      const piece = lp.piece || (lp.pieceId ? {
        id: lp.pieceId,
        reference: lp.referencePiece || lp.reference || '',
        designation: lp.designationPiece || lp.designationPds || lp.designation || lp.nom || '',
        stockMagasin: 99
      } : null);
      const designation = lp.designationPiece || lp.designationPds || lp.designation || lp.nom || piece?.designation || '';
      const rawType = (lp.type || (piece ? 'PDP' : 'PDS')).toUpperCase();
      const type: 'PDP' | 'PDG' | 'PDS' = (rawType === 'PDG' || rawType === 'PDS') ? rawType : 'PDP';
      const qteDemandee = Number(lp.quantite) || 1;
      const prix = Number(lp.prix ?? lp.prixUnitaire ?? piece?.prix ?? 0);
      const tauxRemise = Number(lp.tauxRemise) || 0;
      const key = piece?.id ? `piece:${piece.id}` : `pds:${designation.trim().toLowerCase()}`;

      // Éviter les doublons stricts
      const dejaPresent = this.lignesPieces.some(l => {
        if (piece?.id && l.piece?.id === piece.id) return true;
        if (!piece?.id && l.designation?.trim().toLowerCase() === designation.trim().toLowerCase()) return true;
        return false;
      });
      if (dejaPresent) continue;

      const dejaSorti = this.quantitesDejaSorties.get(key) ?? 0;
      const prevu = this.quantitesPrevues.get(key) ?? qteDemandee;
      const reste = Math.max(0, prevu - dejaSorti);

      this.lignesPieces.push({
        type,
        piece: piece as any,
        designation,
        quantite: reste > 0 ? reste : qteDemandee,
        prix,
        tauxRemise,
        horsProforma: false,
        dejaSortieProforma: reste === 0,
        depassementProforma: false,
        qteProforma: prevu,
        dejaSortie: dejaSorti
      });
    }

    const moList = this.proformaContexte.lignesMainDoeuvres ?? (this.proformaContexte as any).lignesMainDoeuvre ?? [];
    for (const rawLm of moList) {
      const lm = rawLm as any;
      const moId = lm.mainDoeuvreId || lm.mainDoeuvre?.id || lm.id;
      const mo = lm.mainDoeuvre || (moId ? {
        id: moId,
        description: lm.descriptionMainDoeuvre || lm.designation || '',
        prix: lm.tarifHoraire ?? lm.prix
      } : null);
      const designation = lm.descriptionMainDoeuvre || lm.designation || mo?.description || 'Main d\'œuvre';
      const heures = Number(lm.nbreHeure) || 1;
      const tarif = Number(lm.tarifHoraire ?? mo?.prix ?? 0);
      const tauxRemise = Number(lm.tauxRemise) || 0;
      const key = `mo:${moId}`;

      const dejaPresent = this.lignesPieces.some(l => l.type === 'MAIN_DOEUVRE' && (l.mainDoeuvre?.id === moId || l.designation === designation));
      if (dejaPresent) continue;

      const dejaSorti = this.quantitesDejaSorties.get(key) ?? 0;
      const prevu = this.quantitesPrevues.get(key) ?? heures;
      const reste = Math.max(0, prevu - dejaSorti);

      this.lignesPieces.push({
        type: 'MAIN_DOEUVRE',
        mainDoeuvre: mo as any,
        designation,
        quantite: reste > 0 ? reste : heures,
        prix: tarif,
        tauxRemise,
        horsProforma: false,
        dejaSortieProforma: reste === 0,
        depassementProforma: false,
        qteProforma: prevu,
        dejaSortie: dejaSorti
      });
    }
    this.cdr.markForCheck();
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
        this.bons = arr.map(b => this.normaliserBon(b)).sort((a: any, b: any) => b.id - a.id);
        this.applyFilter(); this.cdr.markForCheck(); this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  normaliserBon(bon: any): BonDeSortie {
    if (!bon) return bon;
    if (bon.lignesPieces && (!bon.lignesBonDeSortiePieces || bon.lignesBonDeSortiePieces.length === 0)) {
      bon.lignesBonDeSortiePieces = [
        ...bon.lignesPieces,
        ...(bon.lignesMainDoeuvres || []).map((m: any) => ({
          id: m.id,
          mainDoeuvreId: m.mainDoeuvreId,
          type: 'MAIN_DOEUVRE',
          designation: m.designation || m.code || 'Main d\'œuvre',
          quantite: m.nbreHeure ?? m.quantite ?? 1,
          prix: m.tarifHoraire ?? m.prix ?? 0,
          tauxRemise: m.tauxRemise ?? 0,
          montantTotal: m.montantTotal
        }))
      ];
    }
    return bon;
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
    this.fiscalConfigurationService.getCurrent().subscribe({ next: config => { this.tvaRate = config.tvaRate; this.cdr.markForCheck(); } });
    this.appliquerTVA = false;
    this.ordresTravailLoadVersion++;
    this.form.reset({ remarque: '' });
    this.lignesPieces = [];
    this.piecePdpAjouter = null;
    this.piecePdgAjouter = null;
    this.piecePdsDesignationAjouter = '';
    this.mainDoeuvreAjouter = null;
    this.contextOrdreReparationNumero = context['ordreReparationNumero'] || null;
    this.contextOrdreReparationId = context['ordreReparationId'] ? Number(context['ordreReparationId']) : null;
    this.contextOrdreTravailId = context['ordreTravailId'] ? Number(context['ordreTravailId']) : null;
    this.contextOrdreTravailNumero = context['ordreTravailNumero'] || null;
    this.selectedOrdreTravailId = this.contextOrdreTravailId;
    this.ordresTravailFiltres = [];
    this.loadingOrdresTravail = false;
    this.returnToContext = context['returnTo'] || null;
    this.quantitesPrevues.clear();
    this.quantitesDejaSorties.clear();
    this.piecesProformaSet.clear();
    this.quantitesProforma.clear();
    this.remisesProforma.clear();
    this.proformaContexte = null;
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

    if (this.contextOrdreReparationId || this.contextOrdreTravailId) {
      this.chargerContexteOrdre(this.contextOrdreReparationId, this.contextOrdreTravailId);
    }

    if (this.contextOrdreTravailId) {
      this.loadOrdresTravailPourVehicule(context['vehiculeId'] ? Number(context['vehiculeId']) : null, this.contextOrdreTravailId);
    }

    if (context['clientId']) {
      this.clientService.getById(Number(context['clientId'])).subscribe(client => {
        this.selectedClient = client as unknown as UserModel;
        this.form.patchValue({ clientId: Number(context['clientId']) });
        this.vehiculeService.getByClient(Number(context['clientId'])).subscribe(vehicles => {
          this.vehiculesFiltres = extractContent<VehiculeModel>(vehicles as any);
          if (context['vehiculeId']) {
            this.form.patchValue({ vehiculeId: Number(context['vehiculeId']) });
            this.loadOrdresTravailPourVehicule(Number(context['vehiculeId']), this.contextOrdreTravailId);
          }
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
    this.ordresTravailLoadVersion++;
    this.showCreateModal = false;
    this.errorMessage = '';
    this.saving = false;
    this.lignesPieces = [];
    this.piecePdpAjouter = null;
    this.piecePdgAjouter = null;
    this.piecePdsDesignationAjouter = '';
    this.mainDoeuvreAjouter = null;
    this.contextOrdreReparationId = null;
    this.contextOrdreReparationNumero = null;
    this.contextOrdreTravailId = null;
    this.contextOrdreTravailNumero = null;
    this.selectedOrdreTravailId = null;
    this.ordresTravailFiltres = [];
    this.loadingOrdresTravail = false;
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
    this.piecesProformaSet.clear();
    this.quantitesProforma.clear();
    this.remisesProforma.clear();
    this.proformaContexte = null;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  scrollToModalTop(): void {
    try {
      const el = document.getElementById('modal-bs-body');
      if (el) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {}
  }

  save() {
    this.errorMessage = '';
    const val = this.form.value as any;
    const ordreTravailId = this.contextOrdreTravailId;
    const ordreReparationId = this.contextOrdreReparationId;
    const returnToContext = this.returnToContext;

    if (!val.clientId || this.form.get('clientId')?.invalid) {
      this.errorMessage = 'Veuillez sélectionner un client obligatoire.';
      this.form.get('clientId')?.markAsTouched();
      this.scrollToModalTop();
      this.cdr.markForCheck();
      return;
    }

    if (!val.vehiculeId || this.form.get('vehiculeId')?.invalid) {
      this.errorMessage = 'Veuillez sélectionner un véhicule obligatoire pour ce bon de sortie.';
      this.form.get('vehiculeId')?.markAsTouched();
      this.scrollToModalTop();
      this.cdr.markForCheck();
      return;
    }

    if (this.lignesPieces.length === 0) {
      this.errorMessage = 'Ajoutez au moins une pièce ou une main-d’œuvre.';
      this.cdr.markForCheck();
      return;
    }

    const piecesOnly = this.lignesPieces.filter(l => l.type !== 'MAIN_DOEUVRE');
    const moOnly = this.lignesPieces.filter(l => l.type === 'MAIN_DOEUVRE');

    const depassement = this.lignesPieces.find(l => l.type === 'PDP' && l.piece && (Number(l.quantite) || 0) > (l.piece.stockMagasin ?? 0));
    if (depassement) {
      this.errorMessage = `La quantité pour "${depassement.designation}" (${depassement.quantite}) dépasse le stock magasin disponible (${depassement.piece?.stockMagasin ?? 0}).`;
      this.cdr.markForCheck();
      return;
    }

    const quantiteInvalide = this.lignesPieces.find(l => (Number(l.quantite) || 0) <= 0);
    if (quantiteInvalide) {
      this.errorMessage = `La quantité pour "${quantiteInvalide.designation}" doit être supérieure à 0.`;
      this.cdr.markForCheck();
      return;
    }

    if (this.saving) return;
    this.saving = true;
    this.cdr.markForCheck();

    const lignesPiecesPayload = piecesOnly.map(l => ({
      pieceId: l.piece?.id ?? null,
      type: l.type as 'PDP' | 'PDG' | 'PDS',
      designation: l.designation,
      quantite: Number(l.quantite) || 1,
      prix: Number(l.prix) || 0,
      prixUnitaire: Number(l.prix) || 0,
      tauxRemise: Number(l.tauxRemise) || 0
    }));

    const lignesMainDoeuvresPayload = moOnly.map(l => ({
      mainDoeuvreId: l.mainDoeuvre?.id ?? null,
      designation: l.designation,
      nbreHeure: Number(l.quantite) || 1,
      quantite: Number(l.quantite) || 1,
      tarifHoraire: Number(l.prix) || 0,
      prix: Number(l.prix) || 0,
      tauxRemise: Number(l.tauxRemise) || 0
    }));

    this.bonService.creer({
      clientId: Number(val.clientId),
      vehiculeId: Number(val.vehiculeId),
      ordreReparationId: ordreReparationId ? Number(ordreReparationId) : undefined,
      ordreTravailId: ordreTravailId ? Number(ordreTravailId) : undefined,
      remarque: val.remarque || '',
      appliquerTVA: this.appliquerTVA,
      lignesPieces: lignesPiecesPayload,
      lignesMainDoeuvres: lignesMainDoeuvresPayload
    } as any).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Bon de sortie créé avec succès !');
        this.closeCreate();
        if (returnToContext === 'proforma') {
          this.router.navigate(['/app/proforma']);
        } else if (returnToContext === 'ordres-reparation') {
          this.router.navigate(['/app/ordres-reparation']);
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
        const msg = err.error?.message
          || (Array.isArray(err.error?.errors) ? err.error.errors.map((e: any) => e.defaultMessage || e.message).join(', ') : null)
          || (typeof err.error === 'string' ? err.error : null)
          || err.message
          || 'Erreur lors de la création du bon de sortie.';
        this.errorMessage = msg;
        this.scrollToModalTop();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  openDetail(bon: BonDeSortie) {
    this.selectedBon = this.normaliserBon(bon);
    this.showDetailModal = true;
    this.bonService.getById(bon.id).subscribe({
      next: (fullBon) => {
        if (fullBon) {
          this.selectedBon = this.normaliserBon(fullBon);
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
    if (l.tarifHoraire != null && l.tarifHoraire !== '') return Number(l.tarifHoraire);
    if (l.prixUnitaire != null && l.prixUnitaire !== '') return Number(l.prixUnitaire);
    if (l.piece?.prix != null && l.piece?.prix !== '') return Number(l.piece.prix);
    return 0;
  }

  getLigneTotal(l: any): number {
    if (l?.montantTotal != null) return Number(l.montantTotal);
    const brut = this.getLignePrix(l) * (Number(l?.quantite) || 0);
    const remise = Number(l?.tauxRemise) || 0;
    return Math.round((brut * (1 - remise / 100) + Number.EPSILON) * 100) / 100;
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
