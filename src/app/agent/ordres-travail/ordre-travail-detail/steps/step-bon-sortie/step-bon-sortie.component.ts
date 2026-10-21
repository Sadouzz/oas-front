import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { OrdreTravailService } from '../../../ordre-travail.service';
import {
  StepBonSortieResponseDto,
  StatutOrdreTravail,
  PieceBonSortieDto,
  OrdreTravail,
  BonDeSortieSummaryDto
} from '../../../models/ordre-travail.model';
import { BonDeSortieService } from '../../../../bons-de-sortie/bon-de-sortie.service';
import { BonDeSortie, BonDeSortieRequest } from '../../../../bons-de-sortie/models/bon-de-sortie.model';
import { PieceDetacheeService } from '../../../../pieces-detachees/piece-detachee.service';
import { MainDoeuvreService } from '../../../../main-doeuvre/main-doeuvre.service';
import { SearchableSelectComponent } from '../../../../../shared/components/searchable-select/searchable-select.component';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { PieceDetache, MainDoeuvreModel, extractContent } from '../../../../../shared/models';

export interface LignePiece {
  isCustom?: boolean;
  piece?: PieceDetache;
  pieceIdTemp?: number | null;
  designationPds?: string;
  prixTotal?: number;
  prixUnitaire?: number;
  quantite: number;
  stockDisponible?: number;
  manquant: number;
  aSortirMagasin?: number;
  stockAtelier?: number;
}

export interface LigneMO {
  mo: MainDoeuvreModel;
  quantite: number;
  prixUnitaire?: number;
}

@Component({
  selector: 'app-step-bon-sortie',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent, SearchableSelectComponent],
  templateUrl: './step-bon-sortie.component.html'
})
export class StepBonSortieComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private bdsService = inject(BonDeSortieService);
  private pieceService = inject(PieceDetacheeService);
  private moService = inject(MainDoeuvreService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  private destroy$ = new Subject<void>();
  private searchPdp$ = new Subject<string>();
  private searchPdg$ = new Subject<string>();
  private searchMo$ = new Subject<string>();

  otId!: number;
  data: StepBonSortieResponseDto | null = null;
  loadedOT: OrdreTravail | null = null;

  // Détails complets des bons de sortie indexés par identifiant
  bonsDetails = new Map<number, BonDeSortie>();
  fullBonDeSortie: BonDeSortie | null = null;
  selectedBonToValidate: BonDeSortieSummaryDto | BonDeSortie | null = null;

  loading = true;
  loadingBDS = false;
  creating = false;
  validating = false;
  advancing = false;

  showValidateModal = false;
  showCreateBonModal = false;
  expandedBons = new Set<number>();
  errorMessage = '';
  successMessage = '';

  // ─── Listes pour sélection ───
  allPieces: PieceDetache[] = [];
  allMO: MainDoeuvreModel[] = [];

  piecesPdpList: PieceDetache[] = [];
  piecesPdgList: PieceDetache[] = [];
  moList: MainDoeuvreModel[] = [];

  // ─── Lignes du Bon de Sortie ───
  lignesPieces: LignePiece[] = [];
  lignesMO: LigneMO[] = [];
  remarque = '';

  // 1. Formulaire PDP
  piecePdpAjouter: number | null = null;
  qteAjouterPdp = 1;
  prixAjouterPdp: number | null = null;

  // 2. Formulaire PDG
  piecePdgAjouter: number | null = null;
  qteAjouterPdg = 1;
  prixTotalAjouterPdg: number | null = null;
  private selectedPiecePdgUnitPrice = 0;

  // 3. Formulaire PDS
  pieceCustomDesignation = '';
  pieceCustomPrixTotal: number | null = null;
  pieceCustomQuantite = 1;

  // 4. Formulaire MO
  moAjouter: number | null = null;
  qteAjouterMO = 1;
  prixAjouterMO: number | null = null;

  get piecesPdp(): PieceDetache[] {
    return this.piecesPdpList;
  }

  get piecesPdg(): PieceDetache[] {
    return this.piecesPdgList;
  }

  get lignesPiecesPdp(): LignePiece[] {
    return this.lignesPieces.filter(l => !l.isCustom && l.piece?.type === 'PDP');
  }

  get lignesPiecesPdg(): LignePiece[] {
    return this.lignesPieces.filter(l => !l.isCustom && l.piece?.type === 'PDG');
  }

  get lignesPiecesPds(): LignePiece[] {
    return this.lignesPieces.filter(l => !!l.isCustom);
  }

  get totalPieces(): number {
    return this.lignesPieces.reduce((sum, l) => {
      if (l.isCustom || l.piece?.type === 'PDG') {
        const tot = l.prixTotal != null && l.prixTotal >= 0
          ? Number(l.prixTotal)
          : ((l.prixUnitaire || 0) * (l.quantite || 0));
        return sum + tot;
      }
      const price = l.prixUnitaire != null ? l.prixUnitaire : (l.piece?.prix ?? 0);
      return sum + price * (l.quantite || 0);
    }, 0);
  }

  get totalMO(): number {
    return this.lignesMO.reduce((sum, l) => {
      const price = l.prixUnitaire != null ? l.prixUnitaire : (l.mo?.prix ?? 0);
      return sum + price * (l.quantite || 0);
    }, 0);
  }

  get totalGeneral(): number {
    return this.totalPieces + this.totalMO;
  }

  get totalItemsCount(): number {
    return this.lignesPieces.length + this.lignesMO.length;
  }

  get hasRuptureStock(): boolean {
    return this.lignesPieces.some(l => !l.isCustom && l.manquant > 0);
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-travail']);
      return;
    }
    this.otId = +idParam;

    this.initSearchStreams();
    this.loadCatalogPieces();
    this.loadCatalogMO();
    this.loadData();
    this.loadOTSummary();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initSearchStreams(): void {
    this.searchPdp$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(term => {
        const kw = (term || '').trim();
        return this.pieceService.getAll({ keyword: kw, size: 50, type: 'PDP' } as any).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      const items = extractContent<PieceDetache>(res as any).filter(p => p.statut === 'ACTIF' && p.type === 'PDP');
      this.piecesPdpList = items;
      this.cdr.detectChanges();
    });

    this.searchPdg$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(term => {
        const kw = (term || '').trim();
        return this.pieceService.getAll({ keyword: kw, size: 50, type: 'PDG' } as any).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      const items = extractContent<PieceDetache>(res as any).filter(p => p.statut === 'ACTIF' && p.type === 'PDG');
      this.piecesPdgList = items;
      this.cdr.detectChanges();
    });

    this.searchMo$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(term => {
        const kw = (term || '').trim();
        return this.moService.getAll({ keyword: kw, size: 50 }).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      const items = extractContent<MainDoeuvreModel>(res as any).filter(m => !m.isArchived);
      this.moList = items;
      this.cdr.detectChanges();
    });
  }

  private loadCatalogPieces(): void {
    this.pieceService.getAll({ page: 0, size: 50, type: 'PDP' } as any).subscribe({
      next: (res) => {
        this.piecesPdpList = extractContent<PieceDetache>(res as any).filter(p => p.statut === 'ACTIF' && p.type === 'PDP');
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.pieceService.getAll({ page: 0, size: 50, type: 'PDG' } as any).subscribe({
      next: (res) => {
        this.piecesPdgList = extractContent<PieceDetache>(res as any).filter(p => p.statut === 'ACTIF' && p.type === 'PDG');
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  private loadCatalogMO(): void {
    this.moService.getAll({ page: 0, size: 50 }).subscribe({
      next: (res) => {
        this.moList = extractContent<MainDoeuvreModel>(res as any).filter(m => !m.isArchived);
        this.allMO = this.moList;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  onSearchPdp(term: string): void {
    this.searchPdp$.next(term);
  }

  onSearchPdg(term: string): void {
    this.searchPdg$.next(term);
  }

  onSearchMo(term: string): void {
    this.searchMo$.next(term);
  }

  formatPiece = (p: PieceDetache): string => {
    const stock = p.stockMagasin != null ? `(Stock: ${p.stockMagasin})` : '';
    const price = p.prixUnitaire ?? p.prix ?? (p as any).prixDeVente ?? null;
    const prStr = price != null ? `${price} FCFA` : '';
    return `${p.reference ? (p.reference + ' — ') : ''}${p.designation} ${stock} ${prStr}`.trim();
  };

  formatMO = (m: MainDoeuvreModel): string => {
    const prix = m.prix ? `${m.prix} FCFA` : '';
    const h = m.nbreHeure ? `(${m.nbreHeure}h)` : '';
    const cat = m.categorie?.nom ? `[${m.categorie.nom}] ` : '';
    return `${cat}${m.description || 'Prestation'} ${h} ${prix}`.trim();
  };

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.otService.getStepBonSortie(this.otId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.data = res;
          this.loading = false;

          // Normalisation de la liste des bons de sortie
          const list: BonDeSortieSummaryDto[] = (res.bonsDeSortie && res.bonsDeSortie.length > 0)
            ? [...res.bonsDeSortie]
            : (res.bonDeSortie ? [res.bonDeSortie] : []);

          this.data.bonsDeSortie = list;
          this.data.hasBonDeSortie = list.length > 0;

          if (list.length > 0) {
            for (const bs of list) {
              if (bs.id) {
                this.loadBonDetail(bs.id);
              }
            }
          }

          // Le nouveau bon de sortie doit être vide par défaut (ne jamais injecter automatiquement les pièces)

          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Erreur lors du chargement des Bons de Sortie.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  loadOTSummary(): void {
    this.otService.getSummary(this.otId).subscribe({
      next: (ot) => {
        this.ngZone.run(() => {
          this.loadedOT = ot;
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }

  loadBonDetail(bonId: number): void {
    this.bdsService.getById(bonId).subscribe({
      next: (bon) => {
        this.ngZone.run(() => {
          if (bon && bon.id) {
            this.bonsDetails.set(bon.id, bon);
            if (!this.fullBonDeSortie || this.fullBonDeSortie.id === bon.id) {
              this.fullBonDeSortie = bon;
            }

            if (this.data?.bonsDeSortie) {
              const idx = this.data.bonsDeSortie.findIndex(b => b.id === bon.id);
              if (idx >= 0) {
                this.data.bonsDeSortie[idx] = {
                  ...this.data.bonsDeSortie[idx],
                  numero: bon.reference || this.data.bonsDeSortie[idx].numero,
                  reference: bon.reference || this.data.bonsDeSortie[idx].reference,
                  statut: bon.statut || this.data.bonsDeSortie[idx].statut,
                  dateSortiePrevue: bon.date || this.data.bonsDeSortie[idx].dateSortiePrevue,
                  dateSortieEffective: bon.dateValidation || this.data.bonsDeSortie[idx].dateSortieEffective,
                  remarque: bon.remarque,
                  remarques: bon.remarque,
                  lignesBonDeSortiePieces: bon.lignesBonDeSortiePieces || []
                };
              }
            }
          }
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }

  // ─── Gestion de l'accordéon des Bons de Sortie ───

  toggleBon(bonId: number): void {
    if (this.expandedBons.has(bonId)) {
      this.expandedBons.delete(bonId);
    } else {
      this.expandedBons.add(bonId);
      if (!this.bonsDetails.has(bonId)) {
        this.loadBonDetail(bonId);
      }
    }
    this.cdr.detectChanges();
  }

  isBonExpanded(bonId: number): boolean {
    return this.expandedBons.has(bonId);
  }

  getBonLines(bon: BonDeSortieSummaryDto): any[] {
    const detail = this.getBonDetail(bon.id);
    return detail?.lignesBonDeSortiePieces || bon.lignesBonDeSortiePieces || [];
  }

  // ─── Modal Nouveau Bon de Sortie ───

  openCreateBonModal(prefillPiece?: PieceBonSortieDto): void {
    this.resetCreateBonForm();
    if (prefillPiece) {
      const reste = this.getResteASortir(prefillPiece);
      const pieceId = prefillPiece.pieceId || null;
      const fakePiece: PieceDetache = {
        id: pieceId || 0,
        reference: prefillPiece.reference || '',
        designation: prefillPiece.designation || 'Pièce de rechange',
        stockMagasin: prefillPiece.stockMagasin,
        stockAtelier: prefillPiece.stockAtelier,
        prixUnitaire: prefillPiece.prixUnitaire || 0,
        type: 'PDP',
        statut: 'ACTIF'
      } as any;

      this.lignesPieces.push({
        isCustom: !pieceId,
        piece: fakePiece,
        pieceIdTemp: pieceId,
        designationPds: prefillPiece.designation,
        quantite: reste > 0 ? reste : (prefillPiece.quantiteDemandee || 1),
        prixUnitaire: prefillPiece.prixUnitaire || 0,
        stockDisponible: (prefillPiece.stockMagasin ?? 0) + (prefillPiece.stockAtelier ?? 0),
        manquant: Math.max(0, (reste > 0 ? reste : 1) - (prefillPiece.stockMagasin ?? 0)),
        aSortirMagasin: 1
      });
    }
    this.showCreateBonModal = true;
    this.cdr.detectChanges();
  }

  closeCreateBonModal(): void {
    if (this.creating) return;
    this.showCreateBonModal = false;
    this.cdr.detectChanges();
  }

  resetCreateBonForm(): void {
    this.lignesPieces = [];
    this.lignesMO = [];
    this.remarque = '';
    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.piecePdgAjouter = null;
    this.qteAjouterPdg = 1;
    this.prixTotalAjouterPdg = null;
    this.pieceCustomDesignation = '';
    this.pieceCustomQuantite = 1;
    this.pieceCustomPrixTotal = null;
    this.moAjouter = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
  }

  // ─── Actions Formulaire 1 : PDP ───

  onPiecePdpSelected(pieceId: any): void {
    if (!pieceId) {
      this.prixAjouterPdp = null;
      return;
    }
    const p = this.piecesPdpList.find(item => item.id === Number(pieceId)) || this.allPieces.find(item => item.id === Number(pieceId));
    if (p) {
      const price = p.prixUnitaire ?? p.prix ?? (p as any).prixDeVente ?? (p as any).prixVente ?? null;
      this.prixAjouterPdp = price != null ? Number(price) : null;
    }
  }

  addPiecePdp(): void {
    if (!this.piecePdpAjouter || this.qteAjouterPdp <= 0) return;
    const p = this.piecesPdpList.find(item => item.id === Number(this.piecePdpAjouter)) || this.allPieces.find(item => item.id === Number(this.piecePdpAjouter));
    if (!p) return;

    const defaultPrice = p.prixUnitaire ?? p.prix ?? (p as any).prixDeVente ?? (p as any).prixVente ?? 0;
    const unitPrice = this.prixAjouterPdp != null && this.prixAjouterPdp >= 0 ? Number(this.prixAjouterPdp) : Number(defaultPrice);

    const existing = this.lignesPieces.find(l => !l.isCustom && l.piece?.id === p.id);
    if (existing) {
      existing.quantite += this.qteAjouterPdp;
      existing.prixUnitaire = unitPrice;
      existing.manquant = Math.max(0, existing.quantite - (existing.piece?.stockMagasin ?? 0));
      existing.aSortirMagasin = existing.manquant > 0 ? 0 : 1;
    } else {
      this.lignesPieces.push({
        isCustom: false,
        piece: p,
        quantite: this.qteAjouterPdp,
        prixUnitaire: unitPrice,
        stockDisponible: (p.stockMagasin ?? 0) + (p.stockAtelier ?? 0),
        manquant: Math.max(0, this.qteAjouterPdp - (p.stockMagasin ?? 0)),
        aSortirMagasin: Math.max(0, this.qteAjouterPdp - (p.stockMagasin ?? 0)) > 0 ? 0 : 1
      });
    }

    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.cdr.detectChanges();
  }

  // ─── Actions Formulaire 2 : PDG ───

  onPiecePdgSelected(pieceId: any): void {
    if (!pieceId) {
      this.prixTotalAjouterPdg = null;
      this.selectedPiecePdgUnitPrice = 0;
      return;
    }
    const p = this.piecesPdgList.find(item => item.id === Number(pieceId)) || this.allPieces.find(item => item.id === Number(pieceId));
    if (p) {
      const price = p.prixUnitaire ?? p.prix ?? (p as any).prixDeVente ?? (p as any).prixVente ?? null;
      this.selectedPiecePdgUnitPrice = price != null ? Number(price) : 0;
      this.prixTotalAjouterPdg = this.selectedPiecePdgUnitPrice * (this.qteAjouterPdg || 1);
    }
  }

  onQteAjouterPdgChange(): void {
    if (this.selectedPiecePdgUnitPrice > 0) {
      this.prixTotalAjouterPdg = this.selectedPiecePdgUnitPrice * (this.qteAjouterPdg || 1);
    }
  }

  addPiecePdg(): void {
    if (!this.piecePdgAjouter || this.qteAjouterPdg <= 0) return;
    const p = this.piecesPdgList.find(item => item.id === Number(this.piecePdgAjouter)) || this.allPieces.find(item => item.id === Number(this.piecePdgAjouter));
    if (!p) return;

    const defaultPrice = p.prixUnitaire ?? p.prix ?? (p as any).prixDeVente ?? (p as any).prixVente ?? 0;
    const qte = Number(this.qteAjouterPdg) || 1;
    const total = this.prixTotalAjouterPdg != null && this.prixTotalAjouterPdg >= 0
      ? Number(this.prixTotalAjouterPdg)
      : (Number(defaultPrice) * qte);
    const unitPrice = qte > 0 ? Math.round(total / qte) : 0;

    const existing = this.lignesPieces.find(l => !l.isCustom && l.piece?.id === p.id);
    if (existing) {
      existing.quantite += qte;
      existing.prixTotal = (existing.prixTotal || 0) + total;
      existing.prixUnitaire = existing.quantite > 0 ? Math.round(existing.prixTotal / existing.quantite) : 0;
      existing.manquant = Math.max(0, existing.quantite - (existing.piece?.stockMagasin ?? 0));
      existing.aSortirMagasin = existing.manquant > 0 ? 0 : 1;
    } else {
      this.lignesPieces.push({
        isCustom: false,
        piece: p,
        quantite: qte,
        prixTotal: total,
        prixUnitaire: unitPrice,
        stockDisponible: (p.stockMagasin ?? 0) + (p.stockAtelier ?? 0),
        manquant: Math.max(0, qte - (p.stockMagasin ?? 0)),
        aSortirMagasin: Math.max(0, qte - (p.stockMagasin ?? 0)) > 0 ? 0 : 1
      });
    }

    this.piecePdgAjouter = null;
    this.qteAjouterPdg = 1;
    this.prixTotalAjouterPdg = null;
    this.selectedPiecePdgUnitPrice = 0;
    this.cdr.detectChanges();
  }

  // ─── Actions Formulaire 3 : PDS ───

  addPieceCustom(): void {
    if (!this.pieceCustomDesignation.trim() || this.pieceCustomQuantite <= 0) return;

    const total = this.pieceCustomPrixTotal != null && this.pieceCustomPrixTotal >= 0 ? Number(this.pieceCustomPrixTotal) : 0;
    const qte = Number(this.pieceCustomQuantite) || 1;
    const unitPrice = qte > 0 ? Math.round(total / qte) : 0;
    const des = this.pieceCustomDesignation.trim();

    const existing = this.lignesPieces.find(l => l.isCustom && (l.designationPds || '').trim().toLowerCase() === des.toLowerCase());
    if (existing) {
      existing.quantite += qte;
      existing.prixTotal = (existing.prixTotal || 0) + total;
      existing.prixUnitaire = existing.quantite > 0 ? Math.round(existing.prixTotal / existing.quantite) : 0;
    } else {
      this.lignesPieces.push({
        isCustom: true,
        designationPds: des,
        prixTotal: total,
        prixUnitaire: unitPrice,
        quantite: qte,
        manquant: 0,
        aSortirMagasin: 0
      });
    }

    this.pieceCustomDesignation = '';
    this.pieceCustomPrixTotal = null;
    this.pieceCustomQuantite = 1;
    this.cdr.detectChanges();
  }

  // ─── Actions Formulaire 4 : MO ───

  onMoSelected(moId: any): void {
    if (!moId) {
      this.prixAjouterMO = null;
      return;
    }
    const m = this.moList.find(item => item.id === Number(moId)) || this.allMO.find(item => item.id === Number(moId));
    if (m) {
      const price = m.prix ?? (m as any).tarifHoraire ?? (m as any).prixUnitaire ?? null;
      this.prixAjouterMO = price != null ? Number(price) : null;
    }
  }

  addMO(): void {
    if (!this.moAjouter || this.qteAjouterMO <= 0) return;
    const m = this.moList.find(item => item.id === Number(this.moAjouter)) || this.allMO.find(item => item.id === Number(this.moAjouter));
    if (!m) return;
    const unitPrice = this.prixAjouterMO != null && this.prixAjouterMO >= 0 ? this.prixAjouterMO : (m.prix ?? 0);
    const existing = this.lignesMO.find(l => l.mo?.id === m.id);
    if (existing) {
      existing.quantite += this.qteAjouterMO;
      existing.prixUnitaire = unitPrice;
    } else {
      this.lignesMO.push({ mo: m, quantite: this.qteAjouterMO, prixUnitaire: unitPrice });
    }
    this.moAjouter = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
    this.cdr.detectChanges();
  }

  removePieceItem(item: LignePiece): void {
    const idx = this.lignesPieces.indexOf(item);
    if (idx !== -1) {
      this.lignesPieces.splice(idx, 1);
      this.cdr.detectChanges();
    }
  }

  removeMoItem(item: LigneMO): void {
    const idx = this.lignesMO.indexOf(item);
    if (idx !== -1) {
      this.lignesMO.splice(idx, 1);
      this.cdr.detectChanges();
    }
  }

  onPdgPrixTotalChange(l: LignePiece): void {
    const q = Number(l.quantite) || 1;
    const tot = l.prixTotal != null ? Number(l.prixTotal) : 0;
    l.prixUnitaire = q > 0 ? Math.round(tot / q) : 0;
    this.cdr.detectChanges();
  }

  onPdsPrixTotalChange(l: LignePiece): void {
    const q = Number(l.quantite) || 1;
    const tot = l.prixTotal != null ? Number(l.prixTotal) : 0;
    l.prixUnitaire = q > 0 ? Math.round(tot / q) : 0;
    this.cdr.detectChanges();
  }

  onPieceQuantiteChange(l: LignePiece): void {
    const q = Number(l.quantite) || 1;
    if (l.isCustom || l.piece?.type === 'PDG') {
      if (l.prixTotal != null && l.prixTotal > 0) {
        l.prixUnitaire = q > 0 ? Math.round(l.prixTotal / q) : 0;
      } else if (l.prixUnitaire != null && l.prixUnitaire > 0) {
        l.prixTotal = (l.prixUnitaire || 0) * q;
      }
    }
    if (l.piece) {
      l.manquant = Math.max(0, (l.quantite || 0) - (l.piece?.stockMagasin ?? 0));
      l.aSortirMagasin = l.manquant > 0 ? 0 : 1;
    }
    this.cdr.detectChanges();
  }

  // ─── Calculs d'état pour la page ───

  getResteASortir(p: PieceBonSortieDto): number {
    if (p.quantiteASortir != null) return Math.max(0, Number(p.quantiteASortir));
    return Math.max(0, (Number(p.quantiteDemandee) || 0) - (Number(p.quantiteSortie) || 0));
  }

  getDejaSorti(p: PieceBonSortieDto): number {
    if (p.quantiteSortie != null) return Number(p.quantiteSortie);
    const reste = this.getResteASortir(p);
    return Math.max(0, (Number(p.quantiteDemandee) || 0) - reste);
  }

  isPieceEntierementSortie(p: PieceBonSortieDto): boolean {
    return this.getResteASortir(p) <= 0;
  }

  get totalPiecesDemandees(): number {
    return (this.data?.piecesManquantesProforma || []).reduce((acc, p) => acc + (p.quantiteDemandee || 0), 0);
  }

  get totalPiecesSorties(): number {
    return (this.data?.piecesManquantesProforma || []).reduce((acc, p) => acc + this.getDejaSorti(p), 0);
  }

  get totalPiecesRestantes(): number {
    return (this.data?.piecesManquantesProforma || []).reduce((acc, p) => acc + this.getResteASortir(p), 0);
  }

  getBonDetail(bonId: number): BonDeSortie | undefined {
    return this.bonsDetails.get(bonId);
  }

  getBonReference(bon: BonDeSortieSummaryDto | BonDeSortie | null | undefined): string {
    if (!bon) return '—';
    return (bon as any).reference || (bon as any).numero || ('BS #' + bon.id);
  }

  hasBonDeSortie(): boolean {
    const count = this.data?.bonsDeSortie?.length ?? 0;
    return count > 0 || (this.data?.hasBonDeSortie ?? false) || this.bonsDetails.size > 0;
  }

  isBonValide(bon?: BonDeSortieSummaryDto | BonDeSortie | null): boolean {
    if (bon) {
      return bon.statut === 'VALIDE' || bon.statut === 'LIVRE';
    }
    const list = this.data?.bonsDeSortie || [];
    if (list.length === 0) return false;
    return list.every(b => b.statut === 'VALIDE' || b.statut === 'LIVRE');
  }

  get allBonsValides(): boolean {
    return this.isBonValide();
  }

  get canPasserAEtapeSuivante(): boolean {
    if (!this.hasBonDeSortie() && this.totalPiecesRestantes === 0) {
      return true;
    }
    return this.hasBonDeSortie() && this.allBonsValides;
  }

  // ─── Création effective du Bon de Sortie ───

  creerBonDeSortie(): void {
    if (!this.data) return;

    if (this.lignesPieces.length === 0 && this.lignesMO.length === 0) {
      this.errorMessage = 'Veuillez ajouter au moins une pièce ou prestation dans le Bon de Sortie.';
      this.cdr.detectChanges();
      return;
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    const clientId = this.data.clientId || this.loadedOT?.client?.id || this.loadedOT?.vehicule?.client?.id || 0;
    const vehiculeId = this.data.vehiculeId || this.loadedOT?.vehicule?.id || 0;
    const ordreReparationId = this.data.ordreReparationId || this.loadedOT?.ordreReparationId;

    const lignesPiecesPayload: any[] = [];

    // Pièces PDP, PDG, PDS
    for (const l of this.lignesPieces) {
      lignesPiecesPayload.push({
        pieceId: l.isCustom ? null : (l.piece?.id || l.pieceIdTemp || null),
        quantite: Number(l.quantite) || 1,
        prix: l.prixUnitaire ?? null,
        prixUnitaire: l.prixUnitaire ?? null,
        isCustom: !!l.isCustom,
        designationPds: l.isCustom ? l.designationPds : (l.piece?.designation || l.designationPds)
      });
    }

    // Prestations MO
    for (const m of this.lignesMO) {
      lignesPiecesPayload.push({
        pieceId: null,
        quantite: Number(m.quantite) || 1,
        prix: m.prixUnitaire ?? null,
        prixUnitaire: m.prixUnitaire ?? null,
        isCustom: true,
        designationPds: `[Main d'œuvre] ${m.mo?.description || m.mo?.categorie?.nom || 'Prestation atelier'}`
      });
    }

    const defaultRemarque = `Sortie magasin pour OT ${this.data.numero || ('#' + this.otId)}${this.data.proformaNumero ? ' (Proforma ' + this.data.proformaNumero + ')' : ''}`;

    const payload: BonDeSortieRequest = {
      clientId,
      vehiculeId,
      ordreReparationId: ordreReparationId ?? undefined,
      ordreTravailId: this.otId,
      lignesPieces: lignesPiecesPayload,
      remarque: this.remarque.trim() || defaultRemarque
    };

    this.bdsService.creer(payload).subscribe({
      next: (createdBS: any) => {
        this.ngZone.run(() => {
          this.creating = false;
          const ref = createdBS?.reference || ('#' + createdBS?.id);
          this.successMessage = `Bon de Sortie ${ref} généré avec succès ! Vous pouvez désormais le valider ci-dessous pour transférer les pièces à l'atelier.`;

          if (createdBS) {
            this.bonsDetails.set(createdBS.id, createdBS);
            this.fullBonDeSortie = createdBS;

            const existing = this.data?.bonsDeSortie || [];
            const newSummary: BonDeSortieSummaryDto = {
              id: createdBS.id,
              numero: createdBS.reference || ('BS #' + createdBS.id),
              reference: createdBS.reference || ('BS #' + createdBS.id),
              statut: createdBS.statut || 'EN_ATTENTE',
              dateSortiePrevue: createdBS.date,
              remarque: createdBS.remarque,
              lignesBonDeSortiePieces: createdBS.lignesBonDeSortiePieces || []
            };

            if (this.data) {
              this.data.bonsDeSortie = [...existing, newSummary];
              this.data.hasBonDeSortie = true;
            }
          }

          // Synchroniser les bonDeSortieIds sur l'Ordre de Travail
          const existingIds = (this.data?.bonsDeSortie || []).map(b => b.id).filter((id): id is number => typeof id === 'number');
          const updatedIds = Array.from(new Set([...existingIds, createdBS?.id].filter(Boolean)));

          this.otService.update(this.otId, {
            bonDeSortieIds: updatedIds,
            statut: StatutOrdreTravail.BON_DE_SORTIE
          } as any).subscribe({
            next: () => {},
            error: () => {}
          });

          this.otService.updateStepBonSortie(this.otId, {
            bonDeSortieIds: updatedIds,
            bonDeSortieId: createdBS?.id,
            statut: StatutOrdreTravail.BON_DE_SORTIE
          }).subscribe({
            next: () => {},
            error: () => {}
          });

          // Réinitialiser et fermer le modal
          this.showCreateBonModal = false;
          this.resetCreateBonForm();
          if (createdBS?.id) {
            this.expandedBons.add(createdBS.id);
          }

          this.loadData();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.creating = false;
          this.errorMessage = err.error?.message || err.message || 'Erreur lors de la création du Bon de Sortie.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ─── Validation d'un Bon de Sortie ───

  openValidateModal(bon?: BonDeSortieSummaryDto | BonDeSortie): void {
    if (bon) {
      this.selectedBonToValidate = bon;
    } else {
      const pending = this.data?.bonsDeSortie?.find(b => !this.isBonValide(b));
      this.selectedBonToValidate = pending || this.data?.bonsDeSortie?.[0] || null;
    }
    this.showValidateModal = true;
    this.cdr.detectChanges();
  }

  closeValidateModal(): void {
    if (this.validating) return;
    this.showValidateModal = false;
    this.selectedBonToValidate = null;
    this.cdr.detectChanges();
  }

  confirmerValidation(): void {
    const bonId = this.selectedBonToValidate?.id;
    if (!bonId) {
      this.errorMessage = 'Aucun Bon de Sortie sélectionné pour la validation.';
      this.cdr.detectChanges();
      return;
    }

    this.validating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.bdsService.valider(bonId).subscribe({
      next: (validated: any) => {
        this.ngZone.run(() => {
          this.validating = false;
          this.showValidateModal = false;
          const ref = this.getBonReference(this.selectedBonToValidate);
          this.successMessage = `Bon de Sortie ${ref} validé avec succès ! Les pièces ont été déstockées vers l'atelier.`;

          if (this.selectedBonToValidate) {
            this.selectedBonToValidate.statut = 'VALIDE';
          }

          if (validated && validated.id) {
            this.bonsDetails.set(validated.id, validated);
          }

          this.loadBonDetail(bonId);
          this.loadData();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.validating = false;
          this.errorMessage = err.error?.message || err.message || 'Erreur lors de la validation du Bon de Sortie.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // ─── Navigation vers étape suivante ───

  continuerVersAssignation(): void {
    if (!this.canPasserAEtapeSuivante) {
      this.errorMessage = 'Tous les Bons de Sortie doivent être validés avant de pouvoir passer à l\'affectation des techniciens.';
      this.cdr.detectChanges();
      return;
    }

    this.advancing = true;
    this.cdr.detectChanges();

    if (this.data?.statut === StatutOrdreTravail.BON_DE_SORTIE) {
      this.otService.updateStatut(this.otId, StatutOrdreTravail.ASSIGN_TECHNICIEN).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.advancing = false;
            this.router.navigate(['/app/ordres-travail', this.otId, 'assignation']);
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.advancing = false;
            this.router.navigate(['/app/ordres-travail', this.otId, 'assignation']);
          });
        }
      });
    } else {
      this.advancing = false;
      this.router.navigate(['/app/ordres-travail', this.otId, 'assignation']);
    }
  }
}
