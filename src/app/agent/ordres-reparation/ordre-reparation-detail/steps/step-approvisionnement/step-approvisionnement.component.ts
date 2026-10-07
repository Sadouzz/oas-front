import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import {
  BonDeCommandeService,
  BonDeCommande,
  BonDeCommandeRequest,
  LigneBonDeCommandeRequest
} from '../../../../bons-commande/bon-de-commande.service';
import { FournisseurService } from '../../../../fournisseurs/fournisseur.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { SearchableSelectComponent } from '../../../../../shared/components/searchable-select/searchable-select.component';
import { FournisseurModel, extractContent } from '../../../../../shared/models';
import {
  StepApprovisionnementResponseDto,
  PieceApprovisionnementDto,
  BonCommandeSummaryDto,
  PieceBonCommandeDto
} from '../../../models/responses';

export interface PieceNonCommandeeDto extends PieceApprovisionnementDto {
  quantiteACommander: number;
  quantiteDejaCommandee: number;
}

export interface PieceACommanderItem {
  key: string;
  pieceId?: number;
  designation: string;
  reference?: string;
  type?: string;
  isCustom?: boolean;
  quantiteACommander: number;
  prixUnitaire: number;
  fournisseurId: number | null;
}

export interface ReceptionLigneItem {
  ligneId: number;
  designationPiece: string;
  reference: string;
  quantiteTotale: number;
  quantiteDejaRecue: number;
  quantiteRestante: number;
  quantiteRecue: number;
  isFullyReceived: boolean;
}

@Component({
  selector: 'app-step-approvisionnement',
  standalone: true,
  imports: [CommonModule, AlertComponent, FormsModule, SearchableSelectComponent],
  templateUrl: './step-approvisionnement.component.html'
})
export class StepApprovisionnementComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private bdcService = inject(BonDeCommandeService);
  private fournisseurService = inject(FournisseurService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private fournisseurSearch$ = new Subject<string>();

  ordreId!: number;
  loadedStep: StepApprovisionnementResponseDto | null = null;
  mergedPieces: PieceApprovisionnementDto[] = [];

  fournisseurs: FournisseurModel[] = [];
  selectedFournisseur: FournisseurModel | null = null;
  selectedFournisseurId: number | null = null;
  showFournisseurDropdown = false;
  fournisseurSearchQuery = '';
  fournisseursLoading = false;
  expandedBdcMap: Record<number, boolean> = {};

  piecesToCommand: PieceACommanderItem[] = [];
  globalFournisseurId: number | null = null;

  loading = true;
  saving = false;
  bdcSaving = false;
  actioning = false;
  showBDCModal = false;
  errorMessage = '';
  successMessage = '';

  toggleBdcDetails(id: number): void {
    this.expandedBdcMap[id] = !this.expandedBdcMap[id];
  }

  isBdcExpanded(id: number): boolean {
    return !!this.expandedBdcMap[id];
  }

  get piecesProforma(): PieceApprovisionnementDto[] {
    return this.mergedPieces;
  }

  get bonsDeCommandeList(): BonCommandeSummaryDto[] {
    return this.loadedStep?.bonsDeCommande || [];
  }

  get hasBonDeCommande(): boolean {
    return !!this.loadedStep?.hasBonDeCommande || (this.bonsDeCommandeList.length > 0);
  }

  get latestBdc(): BonCommandeSummaryDto | null {
    if (this.bonsDeCommandeList.length === 0) return null;
    return this.bonsDeCommandeList[0];
  }

  get pendingBdc(): BonCommandeSummaryDto | null {
    return this.bonsDeCommandeList.find(b => b.statut === 'EN_ATTENTE') || null;
  }

  get hasRuptureStock(): boolean {
    return this.piecesProforma.some(p => p.isManquant || (p.quantiteManquante && p.quantiteManquante > 0) || (Number(p.quantiteDemandee || 0) > Number(p.stockMagasin || 0)));
  }

  get rupturesOnly(): PieceApprovisionnementDto[] {
    return this.piecesProforma.filter(p => p.isManquant || (p.quantiteManquante && p.quantiteManquante > 0) || (Number(p.quantiteDemandee || 0) > Number(p.stockMagasin || 0)));
  }

  getBesoinManquant(p: PieceApprovisionnementDto): number {
    /*
    if (p.quantiteManquante != null && p.quantiteManquante > 0) {
      return Number(p.quantiteManquante);
    }
    const demandee = Number(p.quantiteDemandee || 0);
    const stock = Number(p.stockMagasin || 0);
    if (demandee > stock) {
      return demandee - stock;
    }
    */
    const demandee = Number(p.quantiteCommande || 0);
    console.log("demandee: ", p);
    console.log("demandee: ", demandee);
    const recu = Number(p.quantiteRecue || 0);
    console.log("recu: ", recu);
    if (demandee > recu) {
      console.log(demandee - recu);
      return demandee - recu;
    }
    return 0;
  }

  isSamePiece(a: any, b: any): boolean {
    if (!a || !b) return false;

    const aId = a.pieceId ?? a.pieceDetacheeId ?? a.piece?.id;
    const bId = b.pieceId ?? b.pieceDetacheeId ?? b.piece?.id;
    if (aId != null && bId != null && Number(aId) > 0 && Number(bId) > 0 && Number(aId) === Number(bId)) {
      return true;
    }

    const aRef = (a.reference ?? a.referencePiece ?? a.piece?.reference ?? '').trim().toLowerCase();
    const bRef = (b.reference ?? b.referencePiece ?? b.piece?.reference ?? '').trim().toLowerCase();
    if (aRef && bRef && aRef === bRef) {
      return true;
    }

    const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
    const aDes = normalize(a.designation ?? a.designationPiece ?? a.nom ?? a.designationPds ?? a.piece?.designation ?? '');
    const bDes = normalize(b.designation ?? b.designationPiece ?? b.nom ?? b.designationPds ?? b.piece?.designation ?? '');
    if (aDes && bDes && aDes === bDes) {
      return true;
    }

    return false;
  }

  getQuantiteDejaCommandee(p: PieceApprovisionnementDto): number {
    let total = 0;
    for (const bc of this.bonsDeCommandeList) {
      if (bc.statut === 'ANNULE') continue;
      for (const bp of (bc.pieces || [])) {
        if (this.isSamePiece(p, bp)) {
          total += (Number(bp.quantite) || 0);
        }
      }
    }
    return total;
  }

  getQuantiteDejaRecue(p: PieceApprovisionnementDto): number {
    let total = 0;
    for (const bc of this.bonsDeCommandeList) {
      if (bc.statut === 'ANNULE') continue;
      for (const bp of (bc.pieces || [])) {
        if (this.isSamePiece(p, bp)) {
          total += (Number(bp.quantiteRecue) || 0);
        }
      }
    }
    return total;
  }

  isPieceFullyReceived(p: PieceApprovisionnementDto): boolean {
    const demandee = Number(p.quantiteDemandee || 0);
    const stock = Number(p.stockMagasin || 0);
    const manquant = this.getBesoinManquant(p);
    const dejaRecu = this.getQuantiteDejaRecue(p);
    if (manquant <= 0) return true;
    if (stock >= demandee && demandee > 0) return true;
    if (dejaRecu >= manquant) return true;
    if (dejaRecu >= demandee && demandee > 0) return true;
    return false;
  }

  get isAllApprovisionnementComplete(): boolean {
    if (this.mergedPieces.length === 0) return true;
    return this.mergedPieces.every(p => this.isPieceFullyReceived(p));
  }

  get totalPiecesCommandees(): number {
    return this.bonsDeCommandeList
      .filter(bc => bc.statut !== 'ANNULE')
      .reduce((sum, bc) => {
        return sum + (bc.pieces || []).reduce((s, bp) => s + (Number(bp.quantite) || 0), 0);
      }, 0);
  }

  get totalPiecesRecues(): number {
    return this.bonsDeCommandeList
      .filter(bc => bc.statut !== 'ANNULE')
      .reduce((sum, bc) => {
        return sum + (bc.pieces || []).reduce((s, bp) => s + (Number(bp.quantiteRecue) || 0), 0);
      }, 0);
  }

  get totalPiecesEnAttenteReception(): number {
    return Math.max(0, this.totalPiecesCommandees - this.totalPiecesRecues);
  }

  get totalPiecesManquantes(): number {
    return this.mergedPieces.reduce((acc, p) => acc + this.getBesoinManquant(p), 0);
  }

  get uncommandedRuptures(): PieceNonCommandeeDto[] {
    const result: PieceNonCommandeeDto[] = [];
    for (const p of this.piecesProforma) {
      const manquant = this.getBesoinManquant(p);
      if (manquant <= 0) continue;

      const dejaCmd = this.getQuantiteDejaCommandee(p);
      const restantACommander = Math.max(0, manquant - dejaCmd);

      if (restantACommander > 0) {
        result.push({
          ...p,
          quantiteACommander: restantACommander,
          quantiteDejaCommandee: dejaCmd
        });
      }
    }
    return result;
  }

  get totalPiecesNonCommandees(): number {
    return this.uncommandedRuptures.reduce((acc, p) => acc + p.quantiteACommander, 0);
  }

  get hasUncommandedRuptures(): boolean {
    return this.uncommandedRuptures.length > 0;
  }

  getPieceApproStatus(p: PieceApprovisionnementDto) {
    const demandee = Number(p.quantiteDemandee || 0);
    const stock = Number(p.stockMagasin || 0);
    const manquant = this.getBesoinManquant(p);

    const dejaCmd = this.getQuantiteDejaCommandee(p);
    const dejaRecu = this.getQuantiteDejaRecue(p);

    const enCours = Math.max(0, dejaCmd - dejaRecu);
    const resteACommander = Math.max(0, manquant - dejaCmd);
    const resteARecevoir = Math.max(0, dejaCmd - dejaRecu);

    // 1. Si tout ce qui a été commandé a été entièrement reçu (ou stock suffisant)
    if ((dejaCmd > 0 && dejaRecu >= dejaCmd) || (manquant <= 0 && dejaCmd === 0)) {
      if (dejaCmd > 0) {
        return {
          status: 'RECU_TOTAL' as const,
          label: `Reçu (${dejaRecu}/${dejaCmd})`,
          subLabel: `Stock approvisionné (${dejaCmd}/${dejaCmd} commandé)`,
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dejaCmd,
          dejaRecu,
          manquant: 0,
          enCours: 0,
          resteACommander: 0
        };
      }
      return {
        status: 'EN_STOCK' as const,
        label: 'En stock',
        subLabel: `Disponible en magasin (${stock}/${demandee})`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dejaCmd: 0,
        dejaRecu: 0,
        manquant: 0,
        enCours: 0,
        resteACommander: 0
      };
    }

    // 2. Déficit : des pièces ont déjà été reçues partiellement mais il reste des encours ou à commander
    if (dejaRecu > 0) {
      let subLabel = '';
      if (resteACommander === 0 && enCours > 0) {
        subLabel = `Reçu ${dejaRecu} pcs · ${enCours} en attente de livraison`;
      } else if (resteACommander > 0 && enCours > 0) {
        subLabel = `Reçu ${dejaRecu} pcs · ${enCours} en cours · Reste ${resteACommander} à commander`;
      } else {
        subLabel = `Reçu ${dejaRecu} pcs · Reste ${resteACommander} à commander`;
      }

      return {
        status: 'RECU_PARTIEL' as const,
        label: `Reçu partiel (${dejaRecu}/${dejaCmd > 0 ? dejaCmd : manquant})`,
        subLabel,
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        dejaCmd,
        dejaRecu,
        manquant: Math.max(0, manquant - dejaRecu),
        enCours,
        resteACommander
      };
    }

    // 3. 0 reçu pour l'instant mais commande passée en attente
    if (dejaCmd >= manquant && dejaCmd > 0) {
      return {
        status: 'COMMANDE_ATTENTE' as const,
        label: `Commandé (${dejaCmd}/${dejaCmd})`,
        subLabel: `En attente de livraison (${dejaCmd} pcs)`,
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        dejaCmd,
        dejaRecu,
        manquant,
        enCours,
        resteACommander: 0
      };
    }

    // 4. Partiellement commandé
    if (dejaCmd > 0) {
      return {
        status: 'COMMANDE_PARTIEL' as const,
        label: `Partiellement commandé (${dejaCmd} commandé${dejaCmd > 1 ? 's' : ''})`,
        subLabel: `${dejaCmd} en attente · Reste ${resteACommander} à commander`,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        dejaCmd,
        dejaRecu,
        manquant,
        enCours,
        resteACommander
      };
    }

    // 5. Non commandé
    return {
      status: 'NON_COMMANDE' as const,
      label: 'Non commandé',
      subLabel: `Déficit de ${manquant} pièce${manquant > 1 ? 's' : ''}`,
      badgeClass: 'bg-red-100 text-red-700 border-red-200',
      dejaCmd: 0,
      dejaRecu: 0,
      manquant,
      enCours: 0,
      resteACommander: manquant
    };
  }
  
  statutLabel(statut?: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'En attente';
      case 'ENVOYE': return 'Envoyé';
      case 'INCOMPLET': return 'Incomplet';
      case 'RECU': return 'Réceptionné';
      case 'ANNULE': return 'Annulé';
      default: return statut || 'En attente';
    }
  }

  get selectedFournisseurLabel(): string {
    if (this.selectedFournisseur) {
      return this.selectedFournisseur.nomEntreprise || ((this.selectedFournisseur.prenom || '') + ' ' + (this.selectedFournisseur.nom || ''));
    }
    const f = this.fournisseurs.find(x => x.id === this.selectedFournisseurId);
    if (!f) return 'Sélectionner un fournisseur...';
    return f.nomEntreprise || ((f.prenom || '') + ' ' + (f.nom || ''));
  }

  selectFournisseur(f: FournisseurModel): void {
    this.selectedFournisseurId = f.id;
    this.selectedFournisseur = f;
    this.showFournisseurDropdown = false;
  }

  onFournisseurSearch(e: Event): void {
    const query = (e.target as HTMLInputElement).value;
    this.fournisseurSearchQuery = query;
    this.fournisseurSearch$.next(query);
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-reparation']);
      return;
    }
    this.ordreId = +idParam;
    this.loadData();
    this.setupFournisseurSearch();
    this.loadFournisseurs('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  allFournisseursMap: Map<number, FournisseurModel> = new Map();

  setupFournisseurSearch(): void {
    this.fournisseurSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        this.fournisseursLoading = true;
        this.cdr.markForCheck();
        const trimmed = (query || '').trim();
        return this.fournisseurService.getAll({ page: 0, size: 10, ...(trimmed ? { keyword: trimmed } : {}) }).pipe(
          catchError(() => of({ content: [] }))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: any) => {
        const list = extractContent<FournisseurModel>(res).filter((f: any) => !f.archived);
        list.forEach(f => this.allFournisseursMap.set(f.id, f));
        this.fournisseurs = list;
        this.fournisseursLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.fournisseursLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadFournisseurs(query = ''): void {
    this.fournisseursLoading = true;
    const trimmed = (query || '').trim();
    this.fournisseurService.getAll({ page: 0, size: 10, ...(trimmed ? { keyword: trimmed } : {}) }).subscribe({
      next: (res: any) => {
        const list = extractContent<FournisseurModel>(res).filter((f: any) => !f.archived);
        list.forEach(f => this.allFournisseursMap.set(f.id, f));
        this.fournisseurs = list;
        this.fournisseursLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.fournisseursLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchFournisseur(query: string): void {
    this.fournisseurSearchQuery = query;
    this.fournisseurSearch$.next(query);
  }

  loadData(): void {
    this.loading = true;
    this.ordreService.getStepApprovisionnement(this.ordreId).subscribe({
      next: (appro) => {
        this.loadedStep = appro;
        this.buildMergedPiecesList();
        this.loading = false;
        this.initPiecesToCommand();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des données d\'approvisionnement.';
        this.cdr.markForCheck();
      }
    });
  }

  buildMergedPiecesList(): void {
    const mergedList: PieceApprovisionnementDto[] = [];

    const findOrCreate = (rawItem: any): PieceApprovisionnementDto => {
      let found = mergedList.find(p => this.isSamePiece(p, rawItem));
      if (!found) {
        const qte = Number(rawItem.quantiteDemandee ?? rawItem.quantite ?? 1);
        const pu = Number(rawItem.prixUnitaire ?? rawItem.prix ?? rawItem.piece?.prix ?? 0);
        found = {
          ligneId: rawItem.ligneId,
          pieceId: rawItem.pieceId ?? rawItem.pieceDetacheeId ?? rawItem.piece?.id,
          reference: rawItem.reference ?? rawItem.referencePiece ?? rawItem.piece?.reference ?? '',
          designation: rawItem.designation ?? rawItem.designationPiece ?? rawItem.nom ?? rawItem.designationPds ?? rawItem.piece?.designation ?? 'Pièce',
          type: rawItem.type ?? rawItem.piece?.type ?? (rawItem.isCustom ? 'PDS' : 'PDP'),
          isCustom: !!(rawItem.isCustom || rawItem.custom),
          quantiteDemandee: qte,
          stockMagasin: Number(rawItem.stockMagasin ?? 0),
          stockAtelier: Number(rawItem.stockAtelier ?? 0),
          quantiteManquante: Number(rawItem.quantiteManquante ?? 0),
          isManquant: !!rawItem.isManquant,
          prixUnitaire: pu,
          montantTotal: Number(rawItem.montantTotal ?? (qte * pu)),
          quantiteCommande: Number(rawItem.quantiteCommande ?? 0),
          quantiteRecue: Number(rawItem.quantiteRecue ?? 0),
        };
        mergedList.push(found);
      }
      return found;
    };

    // 1. Ajouter les pièces en rupture fournies directement par l'étape approvisionnement
    const stepMissingPieces = this.loadedStep?.piecesManquantesProforma || this.loadedStep?.piecesProforma || [];
    for (const p of stepMissingPieces) {
      const item = findOrCreate(p);
      if (p.ligneId) item.ligneId = p.ligneId;
      if (p.pieceId) item.pieceId = p.pieceId;
      if (p.reference) item.reference = p.reference;
      if (p.designation) item.designation = p.designation;
      if (p.type) item.type = p.type;
      if (p.isCustom != null) item.isCustom = p.isCustom;
      if (p.quantiteDemandee != null && Number(p.quantiteDemandee) > 0) item.quantiteDemandee = Number(p.quantiteDemandee);
      if (p.stockMagasin != null) item.stockMagasin = Number(p.stockMagasin);
      if (p.stockAtelier != null) item.stockAtelier = Number(p.stockAtelier);
      if (p.quantiteManquante != null) item.quantiteManquante = Number(p.quantiteManquante);
      item.isManquant = true;
      if (p.prixUnitaire != null && Number(p.prixUnitaire) > 0) item.prixUnitaire = Number(p.prixUnitaire);
      if (p.montantTotal != null && Number(p.montantTotal) > 0) item.montantTotal = Number(p.montantTotal);
    }

    // 2. Compléter avec les pièces des Bons de Commande
    for (const bc of this.bonsDeCommandeList) {
      if (bc.statut === 'ANNULE') continue;
      for (const bp of (bc.pieces || [])) {
        const item = findOrCreate(bp);
        if (bp.pieceId && !item.pieceId) item.pieceId = bp.pieceId;
        if (bp.reference && !item.reference) item.reference = bp.reference;
        if (bp.designation && !item.designation) item.designation = bp.designation;
        if (bp.prixUnitaire && !item.prixUnitaire) item.prixUnitaire = Number(bp.prixUnitaire);
        if (bp.montantTotal && !item.montantTotal) item.montantTotal = Number(bp.montantTotal);
      }
    }

    // 3. Calcul cohérent des quantités pour chaque pièce fusionnée
    for (const item of mergedList) {
      const demandee = Number(item.quantiteDemandee || 0);
      const dejaRecu = this.getQuantiteDejaRecue(item);
      const isFromMissingDto = stepMissingPieces.some(p => this.isSamePiece(p, item));

      const totalCmd = this.getQuantiteDejaCommandee(item);
      const coveredByAtelier = Number(item.stockAtelier || 0) >= demandee && demandee > 0;

      if (totalCmd > 0 && (!isFromMissingDto || coveredByAtelier)) {
        // Pièce commandée : le vrai manquant = quantité commandée (jamais la quantité du proforma)
        item.quantiteDemandee = totalCmd;
        item.quantiteManquante = Math.max(0, totalCmd - dejaRecu);
        item.stockMagasin = dejaRecu;
        item.isManquant = item.quantiteManquante > 0;
        item.montantTotal = totalCmd * Number(item.prixUnitaire || 0);
      } else if (!isFromMissingDto) {
        // Pas/plus en rupture et jamais commandée
        item.stockMagasin = Math.max(demandee, dejaRecu);
        item.quantiteManquante = 0;
        item.isManquant = false;
      }

      if (!item.montantTotal && item.prixUnitaire) {
        item.montantTotal = Number(item.quantiteDemandee || 1) * item.prixUnitaire;
      }
    }

    this.mergedPieces = mergedList;
  }

  initPiecesToCommand(): void {
    this.piecesToCommand = this.uncommandedRuptures.map((p, idx) => {
      const existing = this.piecesToCommand.find(x => this.isSamePiece(x, p));
      return {
        key: p.pieceId ? `id_${p.pieceId}` : `custom_${idx}_${p.designation}`,
        pieceId: p.pieceId ? Number(p.pieceId) : undefined,
        designation: p.designation || 'Pièce',
        reference: p.reference,
        type: p.type || (p.isCustom ? 'PDS' : 'PDP'),
        isCustom: !!p.isCustom,
        quantiteACommander: p.quantiteACommander || 1,
        prixUnitaire: p.prixUnitaire || 0,
        fournisseurId: existing?.fournisseurId || this.globalFournisseurId || null
      };
    });
  }

  modalErrorMessage = '';

  openBDCModal(): void {
    this.modalErrorMessage = '';
    this.initPiecesToCommand();
    this.showBDCModal = true;
    this.cdr.detectChanges();
  }

  closeBDCModal(): void {
    this.showBDCModal = false;
    this.bdcSaving = false;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  applyGlobalFournisseur(fId: any): void {
    const val = fId ? Number(fId) : null;
    this.globalFournisseurId = val;
    if (val) {
      this.piecesToCommand.forEach(p => p.fournisseurId = val);
    }
    this.cdr.markForCheck();
  }

  getFournisseurName(f: FournisseurModel): string {
    return f.nomEntreprise || ((f.prenom || '') + ' ' + (f.nom || '')).trim() || `Fournisseur #${f.id}`;
  }

  formatFournisseur = (f: FournisseurModel): string => {
    return this.getFournisseurName(f);
  };

  getGroupSummary(): { fournisseurId: number; fournisseurNom: string; piecesCount: number; totalQuantite: number }[] {
    const map = new Map<number, { piecesCount: number; totalQuantite: number }>();
    for (const p of this.piecesToCommand) {
      if (!p.fournisseurId) continue;
      const current = map.get(p.fournisseurId) || { piecesCount: 0, totalQuantite: 0 };
      current.piecesCount += 1;
      current.totalQuantite += p.quantiteACommander;
      map.set(p.fournisseurId, current);
    }
    return Array.from(map.entries()).map(([fId, stats]) => {
      const f = this.allFournisseursMap.get(fId) || this.fournisseurs.find(x => x.id === fId);
      return {
        fournisseurId: fId,
        fournisseurNom: f ? this.getFournisseurName(f) : `Fournisseur #${fId}`,
        piecesCount: stats.piecesCount,
        totalQuantite: stats.totalQuantite
      };
    });
  }

  getDistinctFournisseurCount(): number {
    const set = new Set(this.piecesToCommand.map(p => p.fournisseurId).filter(Boolean));
    return set.size;
  }

  isAllFournisseursSelected(): boolean {
    return this.piecesToCommand.length > 0 && this.piecesToCommand.every(p => !!p.fournisseurId);
  }

  createBonDeCommande(): void {
    if (!this.isAllFournisseursSelected()) {
      this.modalErrorMessage = 'Veuillez sélectionner un fournisseur pour chaque pièce à commander.';
      this.cdr.detectChanges();
      return;
    }

    const groups = new Map<number, PieceACommanderItem[]>();
    for (const item of this.piecesToCommand) {
      if (!item.fournisseurId) continue;
      const list = groups.get(item.fournisseurId) || [];
      list.push(item);
      groups.set(item.fournisseurId, list);
    }

    if (groups.size === 0) {
      this.modalErrorMessage = 'Aucune pièce à commander.';
      this.cdr.detectChanges();
      return;
    }

    this.bdcSaving = true;
    this.modalErrorMessage = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    const requests = Array.from(groups.entries()).map(([fournisseurId, items]) => {
      const lignes: LigneBonDeCommandeRequest[] = items.map(p => ({
        pieceDetacheeId: p.pieceId ? Number(p.pieceId) : undefined,
        quantite: p.quantiteACommander,
        prixUnitaire: p.prixUnitaire || 0,
        designationPds: p.isCustom ? p.designation : undefined,
        typePiece: p.type || (p.isCustom ? 'PDS' : 'PDP')
      }));

      const payload: BonDeCommandeRequest = {
        fournisseurId,
        vehiculeId: this.loadedStep?.vehiculeId ?? null,
        tvaApplicable: true,
        observation: `Approvisionnement pièces pour OR ${this.loadedStep?.numero || ''} (Proforma ${this.loadedStep?.proformaNumero || ''})`,
        lignes
      };
      return this.bdcService.create(payload);
    });

    forkJoin(requests).subscribe({
      next: (createdBons) => {
        this.bdcSaving = false;
        this.showBDCModal = false;
        const count = createdBons.length;
        this.successMessage = `${count} bon${count > 1 ? 's' : ''} de commande fournisseur créé${count > 1 ? 's' : ''} avec succès !`;
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.bdcSaving = false;
        this.modalErrorMessage = err?.error?.message || 'Erreur lors de la création des bons de commande.';
        this.cdr.detectChanges();
      }
    });
  }

  ajouterPiecesAuBdc(bdcId: number): void {
    const piecesToAdd = this.uncommandedRuptures;
    if (piecesToAdd.length === 0) return;

    this.bdcSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.bdcService.getById(bdcId).subscribe({
      next: (fullBon: any) => {
        const bon = (fullBon?.data || fullBon) as BonDeCommande;
        const existingLignes = [...(bon.lignes || [])];

        const mergedLignes: LigneBonDeCommandeRequest[] = existingLignes.map(l => ({
          id: l.id ? Number(l.id) : undefined,
          pieceDetacheeId: l.pieceDetacheeId ? Number(l.pieceDetacheeId) : undefined,
          quantite: Number(l.quantite || 1),
          prixUnitaire: Number(l.prixUnitaire || 0),
          designationPds: l.isCustom ? l.designationPiece : undefined,
          typePiece: l.isCustom ? 'PDS' : 'PDP'
        }));

        for (const p of piecesToAdd) {
          const existingLigne = mergedLignes.find(l => {
            if (p.pieceId && l.pieceDetacheeId) {
              return Number(p.pieceId) === Number(l.pieceDetacheeId);
            }
            if (p.isCustom && l.designationPds && p.designation) {
              return l.designationPds.trim().toLowerCase() === p.designation.trim().toLowerCase();
            }
            return false;
          });

          if (existingLigne) {
            existingLigne.quantite += p.quantiteACommander;
          } else {
            mergedLignes.push({
              pieceDetacheeId: p.pieceId ? Number(p.pieceId) : undefined,
              quantite: p.quantiteACommander,
              prixUnitaire: p.prixUnitaire || 0,
              designationPds: p.isCustom ? p.designation : undefined,
              typePiece: p.type || (p.isCustom ? 'PDS' : 'PDP')
            });
          }
        }

        const payload: BonDeCommandeRequest = {
          fournisseurId: bon.fournisseurId ? Number(bon.fournisseurId) : null,
          vehiculeId: bon.vehiculeId ? Number(bon.vehiculeId) : null,
          tvaApplicable: bon.tvaApplicable ?? true,
          observation: bon.observation || `Approvisionnement pièces pour OR ${this.loadedStep?.numero || ''} (Proforma ${this.loadedStep?.proformaNumero || ''})`,
          lignes: mergedLignes
        };

        this.bdcService.update(bdcId, payload).subscribe({
          next: () => {
            this.bdcSaving = false;
            this.successMessage = `Les pièces manquantes (${this.totalPiecesNonCommandees} pièce(s)) ont été ajoutées avec succès au Bon de Commande ${bon.numero || ''}.`;
            this.loadData();
          },
          error: (err) => {
            this.bdcSaving = false;
            this.errorMessage = err?.error?.message || 'Erreur lors de l\'ajout des pièces au bon de commande.';
            this.cdr.markForCheck();
          }
        });
      },
      error: (err) => {
        this.bdcSaving = false;
        this.errorMessage = err?.error?.message || 'Impossible de récupérer les informations du bon de commande.';
        this.cdr.markForCheck();
      }
    });
  }

  envoyerBdc(bdcId: number): void {
    this.actioning = true;
    this.bdcService.envoyer(bdcId).subscribe({
      next: () => {
        this.actioning = false;
        this.successMessage = 'Bon de commande marqué comme envoyé au fournisseur.';
        this.loadData();
      },
      error: (err) => {
        this.actioning = false;
        this.errorMessage = err.error?.message || 'Erreur lors de l\'envoi du bon de commande.';
        this.cdr.markForCheck();
      }
    });
  }

  showReceptionModal = false;
  selectedBonForReception: BonDeCommande | null = null;
  receptionLignes: ReceptionLigneItem[] = [];
  receptionSaving = false;
  receptionErrorMessage = '';

  get allPiecesAlreadyReceived(): boolean {
    return this.receptionLignes.length > 0 && this.receptionLignes.every(l => l.isFullyReceived);
  }

  get totalQuantiteRecueNow(): number {
    return this.receptionLignes
      .filter(l => !l.isFullyReceived)
      .reduce((sum, l) => sum + (Number(l.quantiteRecue) || 0), 0);
  }

  openReceptionPopup(bonId: number): void {
    this.receptionErrorMessage = '';
    this.receptionSaving = false;
    this.loading = true;
    this.bdcService.getById(bonId).subscribe({
      next: (fullBon: any) => {
        const bon = (fullBon?.data || fullBon) as BonDeCommande;
        if (bon) {
          this.selectedBonForReception = bon;
          this.initReceptionLignes(bon);
        }
        this.loading = false;
        this.showReceptionModal = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Impossible de récupérer les informations du bon de commande.';
        this.cdr.markForCheck();
      }
    });
  }

  private initReceptionLignes(bon: BonDeCommande): void {
    this.receptionLignes = (bon.lignes || []).map(l => {
      const qteTotale = Number(l.quantite) || 0;
      const qteDejaRecue = Number(l.quantiteRecue) || 0;
      const qteRestante = Math.max(0, qteTotale - qteDejaRecue);
      const isFully = qteDejaRecue >= qteTotale && qteTotale > 0;
      return {
        ligneId: l.id!,
        designationPiece: l.designationPiece || l.reference || 'Pièce',
        reference: l.reference || '',
        quantiteTotale: qteTotale,
        quantiteDejaRecue: qteDejaRecue,
        quantiteRestante: qteRestante,
        quantiteRecue: isFully ? 0 : qteRestante,
        isFullyReceived: isFully,
      };
    });
  }

  saveReception(): void {
    if (!this.selectedBonForReception) return;
    this.receptionErrorMessage = '';

    if (this.allPiecesAlreadyReceived) {
      this.receptionErrorMessage = 'Toutes les pièces de ce bon de commande ont déjà été intégralement réceptionnées.';
      this.cdr.markForCheck();
      return;
    }

    const nonFullyLines = this.receptionLignes.filter(l => !l.isFullyReceived);
    const totalNewReceived = nonFullyLines.reduce((sum, l) => sum + (Number(l.quantiteRecue) || 0), 0);

    if (nonFullyLines.length > 0 && totalNewReceived <= 0) {
      this.receptionErrorMessage = 'Veuillez renseigner au moins une quantité reçue supérieure à 0.';
      this.cdr.markForCheck();
      return;
    }

    this.receptionSaving = true;
    this.cdr.markForCheck();

    const request = {
      lignes: this.receptionLignes.map(l => ({
        ligneId: l.ligneId,
        quantiteRecue: l.isFullyReceived ? 0 : (Number(l.quantiteRecue) || 0),
      }))
    };

    this.bdcService.receptionnerAvecReception(this.selectedBonForReception.id, request).subscribe({
      next: () => {
        this.receptionSaving = false;
        this.showReceptionModal = false;
        this.successMessage = 'Bon de réception validé avec succès ! Le stock magasin a été mis à jour.';
        this.loadData();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.receptionSaving = false;
        this.receptionErrorMessage = err?.error?.message || 'Erreur lors de la validation de la réception.';
        this.cdr.markForCheck();
      }
    });
  }

  validateStep(): void {
    if (!this.isAllApprovisionnementComplete) {
      if (this.hasUncommandedRuptures) {
        this.openBDCModal();
      } else {
        this.errorMessage = 'Veuillez réceptionner toutes les pièces commandées auprès des fournisseurs avant de passer au Bon de Sortie.';
        this.cdr.markForCheck();
      }
    } else {
      this.passerEtapeSuivante();
    }
  }

  passerEtapeSuivante(): void {
    this.saving = true;
    this.ordreService.updateStatut(this.ordreId, 'BON_DE_SORTIE').subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
      },
      error: () => {
        this.saving = false;
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
      }
    });
  }
}

