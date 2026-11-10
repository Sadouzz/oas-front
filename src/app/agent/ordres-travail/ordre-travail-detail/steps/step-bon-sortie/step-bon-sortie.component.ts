import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepBonSortieResponseDto, StatutOrdreTravail, OrdreTravail } from '../../../models/ordre-travail.model';
import { BonDeSortieService } from '../../../../bons-de-sortie/bon-de-sortie.service';
import { BonDeSortie } from '../../../../bons-de-sortie/models/bon-de-sortie.model';
import { PieceDetacheeService } from '../../../../pieces-detachees/piece-detachee.service';
import { MainDoeuvreService } from '../../../../main-doeuvre/main-doeuvre.service';
import { ProformaService } from '../../../../proforma/proforma.service';
import { Proforma } from '../../../../proforma/models/proforma.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { SearchableSelectComponent } from '../../../../../shared/components/searchable-select/searchable-select.component';
import { AuthService } from '../../../../../core/services/auth.service';
import { PieceDetache, MainDoeuvreModel, extractContent } from '../../../../../shared/models';

export interface LignePieceBSItem {
  existingLineId?: number;
  isSavedInBon?: boolean;
  savedQuantite?: number;
  isCustom?: boolean;
  type?: 'PDP' | 'PDG' | 'PDS';
  piece?: PieceDetache;
  designationPds?: string;
  prixTotal?: number;
  prixUnitaire?: number;
  tauxRemise?: number;
  quantite: number;
  proformaLineId?: number;
}

export interface LigneMOBSItem {
  existingLineId?: number;
  isSavedInBon?: boolean;
  mo: MainDoeuvreModel;
  quantite: number;
  prixUnitaire?: number;
  tauxRemise?: number;
  proformaLineId?: number;
}

export interface LigneComparaisonProformaBS {
  key: string;
  type: 'PDP' | 'PDG' | 'PDS';
  reference: string;
  designation: string;
  qteProforma: number;
  qteBS: number;
  ecart: number;
  statut: 'CONFORME' | 'MANQUANT' | 'PARTIEL' | 'SURPLUS' | 'HORS_PROFORMA';
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
  private proformaService = inject(ProformaService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  private destroy$ = new Subject<void>();
  private searchPdp$ = new Subject<string>();
  private searchPdg$ = new Subject<string>();
  private searchMo$ = new Subject<string>();

  otId!: number;
  data: StepBonSortieResponseDto | null = null;
  loadedOT: OrdreTravail | null = null;
  proformaContexte: Proforma | null = null;
  fullBonDeSortie: BonDeSortie | null = null;
  bonsDeSortie: BonDeSortie[] = [];

  allPieces: PieceDetache[] = [];
  allMO: MainDoeuvreModel[] = [];
  piecesPdpList: PieceDetache[] = [];
  piecesPdgList: PieceDetache[] = [];
  moList: MainDoeuvreModel[] = [];

  lignesPieces: LignePieceBSItem[] = [];
  lignesMO: LigneMOBSItem[] = [];

  // Champs d'ajout PDP
  piecePdpAjouter: number | null = null;
  qteAjouterPdp = 1;
  prixAjouterPdp: number | null = null;

  // Champs d'ajout PDG
  piecePdgAjouter: number | null = null;
  qteAjouterPdg = 1;
  prixTotalAjouterPdg: number | null = null;
  private selectedPiecePdgUnitPrice = 0;

  // Champs d'ajout PDS (Hors catalogue)
  pieceCustomDesignation = '';
  pieceCustomPrixTotal: number | null = null;
  pieceCustomQuantite = 1;

  // Champs d'ajout MO
  moAjouter: number | null = null;
  qteAjouterMO = 1;
  prixAjouterMO: number | null = null;

  remarque = '';

  loading = true;
  saving = false;
  validating = false;
  advancing = false;

  showValidateModal = false;
  hasModifiedExistingBon = false;
  errorMessage = '';
  successMessage = '';

  get isReadOnly(): boolean {
    return this.isBonValide();
  }

  get canValidateBonDeSortie(): boolean {
    const role = this.authService.getRole() ?? '';
    return ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'].includes(role);
  }

  get piecesPdp(): PieceDetache[] {
    return this.piecesPdpList;
  }

  get piecesPdg(): PieceDetache[] {
    return this.piecesPdgList;
  }

  get selectedPiecePdp(): PieceDetache | undefined {
    const id = Number(this.piecePdpAjouter);
    return this.piecesPdpList.find(piece => piece.id === id) ?? this.allPieces.find(piece => piece.id === id);
  }

  get selectedPiecePdg(): PieceDetache | undefined {
    const id = Number(this.piecePdgAjouter);
    return this.piecesPdgList.find(piece => piece.id === id) ?? this.allPieces.find(piece => piece.id === id);
  }

  get selectedMO(): MainDoeuvreModel | undefined {
    const id = Number(this.moAjouter);
    return this.moList.find(mo => mo.id === id) ?? this.allMO.find(mo => mo.id === id);
  }

  get lignesPiecesPdp(): LignePieceBSItem[] {
    return this.lignesPieces.filter(l => !l.isCustom && (l.type === 'PDP' || l.piece?.type === 'PDP'));
  }

  get lignesPiecesPdg(): LignePieceBSItem[] {
    return this.lignesPieces.filter(l => !l.isCustom && (l.type === 'PDG' || l.piece?.type === 'PDG'));
  }

  get lignesPiecesPds(): LignePieceBSItem[] {
    return this.lignesPieces.filter(l => !!l.isCustom || l.type === 'PDS');
  }

  get proformaPdsList(): any[] {
    const lignes = [
      ...(this.data?.lignesPiecesProforma ?? []),
      ...(this.proformaContexte?.lignesPieces ?? []),
      ...((this.proformaContexte as any)?.pieces ?? []),
      ...((this.data?.lignesPiecesProforma == null && this.data?.lignesPiecesBS == null) ? (this.data?.lignesPieces ?? []) : [])
    ];
    return lignes.filter((l: any) => l.isCustom || String(l.type || '').toUpperCase() === 'PDS' || (!l.pieceId && !l.piece?.id));
  }

  get unaddedProformaPds(): any[] {
    const addedIds = new Set(
      this.lignesPieces
        .filter(l => l.proformaLineId != null)
        .map(l => Number(l.proformaLineId))
    );
    return this.proformaPdsList.filter(l => l.id != null && !addedIds.has(Number(l.id)));
  }

  get hasAtLeastOneItem(): boolean {
    return (this.lignesPieces && this.lignesPieces.length > 0) || (this.lignesMO && this.lignesMO.length > 0);
  }

  get hasUnsavedItems(): boolean {
    return this.hasModifiedExistingBon || this.lignesPieces.some(l => !l.isSavedInBon) || this.lignesMO.some(m => !m.isSavedInBon);
  }

  get totalPieces(): number {
    return this.lignesPieces.reduce((sum, l) => {
      let montantBrut: number;
      if (l.isCustom || l.type === 'PDG' || l.piece?.type === 'PDG') {
        const tot = (l.type === 'PDG' || l.piece?.type === 'PDG') && l.piece?.prixUnitaire != null
          ? Number(l.piece.prixUnitaire) * (l.quantite || 0)
          : l.prixTotal != null && l.prixTotal >= 0
          ? Number(l.prixTotal)
          : ((l.prixUnitaire || 0) * (l.quantite || 0));
        montantBrut = tot;
      } else {
        const price = l.prixUnitaire != null ? l.prixUnitaire : (l.piece?.prixUnitaire ?? 0);
        montantBrut = price * (l.quantite || 0);
      }
      return sum + montantBrut * (1 - Math.max(0, Math.min(100, Number(l.tauxRemise) || 0)) / 100);
    }, 0);
  }

  get totalMO(): number {
    return this.lignesMO.reduce((sum, l) => {
      const price = l.prixUnitaire != null ? l.prixUnitaire : (l.mo?.prix ?? 0);
      return sum + price * (l.quantite || 0) * (1 - Math.max(0, Math.min(100, Number(l.tauxRemise) || 0)) / 100);
    }, 0);
  }

  get tauxRemiseClient(): number {
    return Math.max(0, Math.min(100, Number((this.data as any)?.tauxRemiseClient ?? this.proformaContexte?.tauxRemiseClient) || 0));
  }

  get montantRemiseClient(): number {
    return this.totalPieces * this.tauxRemiseClient / 100;
  }

  get totalGeneral(): number {
    return this.totalPieces - this.montantRemiseClient + this.totalMO;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-travail']);
      return;
    }
    this.otId = +idParam;
    this.initSearchStreams();
    this.loadData();
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
        return this.pieceService.getAll({ keyword: kw, size: 10, type: 'PDP' } as any).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      const items = extractContent<PieceDetache>(res as any).filter(p => p.statut === 'ACTIF' && p.type === 'PDP');
      this.piecesPdpList = items;
      this.mergePiecesIntoCache(items);
      this.cdr.markForCheck();
    });

    this.searchPdg$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(term => {
        const kw = (term || '').trim();
        return this.pieceService.getAll({ keyword: kw, size: 10, type: 'PDG' } as any).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      const items = extractContent<PieceDetache>(res as any).filter(p => p.statut === 'ACTIF' && p.type === 'PDG');
      this.piecesPdgList = items;
      this.mergePiecesIntoCache(items);
      this.cdr.markForCheck();
    });

    this.searchMo$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(term => {
        const kw = (term || '').trim();
        return this.moService.getAll({ keyword: kw, size: 10 }).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(res => {
      const items = extractContent<MainDoeuvreModel>(res as any).filter(m => !m.isArchived);
      this.moList = items;
      this.mergeMoIntoCache(items);
      this.cdr.markForCheck();
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

  private mergePiecesIntoCache(pieces: PieceDetache[]): void {
    for (const p of pieces) {
      if (!this.allPieces.some(existing => existing.id === p.id)) {
        this.allPieces.push(p);
      }
    }
  }

  private mergeMoIntoCache(mos: MainDoeuvreModel[]): void {
    for (const m of mos) {
      if (!this.allMO.some(existing => existing.id === m.id)) {
        this.allMO.push(m);
      }
    }
  }

  normaliserBon(bon: any): BonDeSortie {
    if (!bon) return bon;
    const b = (bon && bon.data !== undefined) ? bon.data : bon;
    if (b.lignesPieces && (!b.lignesBonDeSortiePieces || b.lignesBonDeSortiePieces.length === 0)) {
      b.lignesBonDeSortiePieces = [
        ...b.lignesPieces,
        ...(b.lignesMainDoeuvres || []).map((m: any) => ({
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
    return b;
  }

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    forkJoin({
      pieces: this.pieceService.getAll({ size: 10 } as any).pipe(catchError(() => of([]))),
      mo: this.moService.getAll({ size: 10 } as any).pipe(catchError(() => of([]))),
      stepBs: this.otService.getStepBonSortie(this.otId)
    }).subscribe({
      next: ({ pieces, mo, stepBs }) => {
        this.ngZone.run(() => {
          this.allPieces = extractContent<PieceDetache>(pieces as any).filter(p => p.statut === 'ACTIF' && p.type !== 'PDS');
          this.allMO = extractContent<MainDoeuvreModel>(mo as any).filter(m => !m.isArchived);
          this.piecesPdpList = this.allPieces.filter(p => p.type === 'PDP');
          this.piecesPdgList = this.allPieces.filter(p => p.type === 'PDG');
          this.moList = this.allMO;

          this.data = stepBs;
          this.bonsDeSortie = (stepBs.bonsDeSortie || []).map(b => this.normaliserBon(b));

          // Identifier le bon de sortie existant uniquement s'il y en a un dans stepBs
          const existingBonId = this.bonsDeSortie[0]?.id || stepBs.bonDeSortie?.id;
          if (existingBonId) {
            this.bdsService.getById(existingBonId).pipe(catchError(() => of(this.bonsDeSortie[0] || null))).subscribe(fullBon => {
              this.ngZone.run(() => {
                if (fullBon) {
                  this.fullBonDeSortie = this.normaliserBon(fullBon);
                  this.patchDataWithBon(this.fullBonDeSortie);
                  this.populateLinesFromBon(this.fullBonDeSortie);
                }
                if (this.lignesPieces.length === 0 && this.lignesMO.length === 0) {
                  this.populateLinesFromStepData(stepBs, !!stepBs.hasBonDeSortie);
                }
                this.loading = false;
                this.cdr.detectChanges();
              });
            });
          } else {
            this.fullBonDeSortie = null;
            this.populateLinesFromStepData(stepBs, false);
            this.loading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Erreur lors du chargement du Bon de Sortie.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  private populateLinesFromBon(bon: BonDeSortie): void {
    this.lignesPieces = [];
    this.lignesMO = [];
    this.hasModifiedExistingBon = false;
    this.remarque = bon.remarque || '';

    const rawPieces = (bon.lignesPieces && bon.lignesPieces.length > 0)
      ? bon.lignesPieces.filter((l: any) => l.type !== 'MAIN_DOEUVRE' && !l.mainDoeuvreId)
      : (bon.lignesBonDeSortiePieces || []).filter((l: any) => l.type !== 'MAIN_DOEUVRE' && !l.mainDoeuvreId);

    for (const l of rawPieces) {
      const lAny = l as any;
      const pieceId = l.piece?.id ?? lAny.pieceId ?? null;
      const catalogPiece = pieceId ? this.allPieces.find(p => p.id === Number(pieceId)) : null;
      const rawType = String(l.type || catalogPiece?.type || (pieceId ? 'PDP' : 'PDS')).toUpperCase();
      const isCustom = rawType === 'PDS' || (!pieceId && rawType !== 'PDG' && rawType !== 'PDP');
      const pieceType: 'PDP' | 'PDG' | 'PDS' = isCustom ? 'PDS' : (rawType === 'PDG' ? 'PDG' : 'PDP');

      const pfLine = isCustom
        ? this.findProformaLineForPds(l.designation || lAny.designationPds || lAny.designationPiece || '', l)
        : (pieceId ? this.findProformaLineForPiece(Number(pieceId), pieceType === 'PDG' ? 'PDG' : 'PDP', l) : null);

      const pfQte = Number(pfLine?.quantite);
      const qte = Number(l.quantite ?? (Number.isFinite(pfQte) && pfQte > 0 ? pfQte : 1)) || 1;

      const pfPrice = Number(pfLine?.prixUnitaire ?? pfLine?.prix ?? pfLine?.prixCatalogue);
      const unitPrice = Number(l.prix ?? lAny.prixUnitaire ?? (Number.isFinite(pfPrice) && pfPrice >= 0 ? pfPrice : (catalogPiece?.prixUnitaire ?? 0)));
      const total = (lAny.prixTotal != null && Number(lAny.prixTotal) > 0)
        ? Number(lAny.prixTotal)
        : (pfLine?.prixTotal != null && Number(pfLine.prixTotal) > 0)
        ? Number(pfLine.prixTotal)
        : (unitPrice * qte);

      const bonRemise = Number(l.tauxRemise ?? lAny.remise ?? lAny.pourcentageRemise ?? 0);
      const pfRemise = Number(pfLine?.tauxRemise ?? pfLine?.remise ?? pfLine?.pourcentageRemise ?? 0);
      const finalRemise = pfLine != null ? pfRemise : bonRemise;

      const resolvedPiece: PieceDetache | undefined = isCustom
        ? undefined
        : (catalogPiece || (l.piece ? { ...(l.piece as any), type: pieceType } : {
            id: Number(pieceId),
            reference: lAny.referencePiece || lAny.reference || pfLine?.referencePiece || '',
            designation: l.designation || lAny.designationPiece || pfLine?.designationPiece || 'Pièce',
            type: pieceType,
            prixUnitaire: unitPrice
          } as any));

      this.lignesPieces.push({
        existingLineId: l.id,
        isSavedInBon: true,
        savedQuantite: qte,
        isCustom,
        type: pieceType,
        piece: resolvedPiece,
        designationPds: l.designation || lAny.designationPds || lAny.designationPiece || pfLine?.designationPds || pfLine?.designationPiece || resolvedPiece?.designation || 'Pièce',
        quantite: qte,
        prixUnitaire: unitPrice,
        prixTotal: total,
        tauxRemise: finalRemise,
        proformaLineId: pfLine?.id ?? l.proformaLineId ?? undefined
      });
    }

    const rawMO: any[] = (bon.lignesMainDoeuvres && bon.lignesMainDoeuvres.length > 0)
      ? bon.lignesMainDoeuvres
      : (bon.lignesBonDeSortiePieces || []).filter((l: any) => l.type === 'MAIN_DOEUVRE' || !!l.mainDoeuvreId);

    for (const m of rawMO) {
      const moId = m.mainDoeuvreId ?? m.mainDoeuvre?.id ?? null;
      const catalogMO = moId ? this.allMO.find(item => item.id === Number(moId)) : null;
      const des = m.descriptionMainDoeuvre || m.designation || m.nom || m.description || m.code || catalogMO?.description || 'Main-d’œuvre';
      const resolvedMO: MainDoeuvreModel = catalogMO || ({
        id: Number(moId || m.id || Date.now()),
        description: des,
        prix: Number(m.tarifHoraire ?? m.prix ?? 0),
        nbreHeure: Number(m.nbreHeure ?? m.quantite ?? 1) || 1,
        isArchived: false
      } as MainDoeuvreModel);

      const pfLine = this.findProformaLineForMO(resolvedMO, m);

      const pfQte = Number(pfLine?.nbreHeure ?? pfLine?.quantite);
      const qte = Number(m.nbreHeure ?? m.quantite ?? (Number.isFinite(pfQte) && pfQte > 0 ? pfQte : 1)) || 1;

      const pfPrice = Number(pfLine?.tarifHoraire ?? pfLine?.prix);
      const unitPrice = Number(m.tarifHoraire ?? m.prix ?? (Number.isFinite(pfPrice) && pfPrice >= 0 ? pfPrice : (catalogMO?.prix ?? 0)));

      const bonRemise = Number(m.tauxRemise ?? m.remise ?? m.pourcentageRemise ?? 0);
      const pfRemise = Number(pfLine?.tauxRemise ?? pfLine?.remise ?? pfLine?.pourcentageRemise ?? 0);
      const finalRemise = pfLine != null ? pfRemise : bonRemise;

      this.lignesMO.push({
        existingLineId: m.id,
        isSavedInBon: true,
        mo: resolvedMO,
        quantite: qte,
        prixUnitaire: unitPrice,
        tauxRemise: finalRemise,
        proformaLineId: pfLine?.id ?? m.proformaLineId ?? undefined
      });
    }

    // Assigner automatiquement les prestations de MO du proforma qui ne seraient pas encore dans le Bon
    const proformaMOList: any[] = (this.data?.lignesMainDoeuvresProforma && this.data.lignesMainDoeuvresProforma.length > 0)
      ? this.data.lignesMainDoeuvresProforma
      : (this.data?.mainDoeuvresProforma || []);
    for (const pfMo of proformaMOList) {
      const pfMoId = pfMo.mainDoeuvreId ?? pfMo.id;
      const alreadyPresent = this.lignesMO.some(item =>
        (item.proformaLineId != null && pfMo.id != null && Number(item.proformaLineId) === Number(pfMo.id)) ||
        (pfMoId && item.mo?.id === Number(pfMoId))
      );
      if (!alreadyPresent) {
        const catalogMO = pfMoId ? this.allMO.find(item => item.id === Number(pfMoId)) : null;
        const des = pfMo.descriptionMainDoeuvre || pfMo.designation || catalogMO?.description || 'Main-d’œuvre';
        const qte = Number(pfMo.nbreHeure ?? pfMo.quantite ?? 1) || 1;
        const unitPrice = Number(pfMo.tarifHoraire ?? pfMo.prix ?? catalogMO?.prix ?? 0);
        const resolvedMO: MainDoeuvreModel = catalogMO || ({
          id: Number(pfMoId || Date.now()),
          description: des,
          prix: unitPrice,
          nbreHeure: qte,
          isArchived: false
        } as MainDoeuvreModel);

        this.lignesMO.push({
          isSavedInBon: false,
          mo: resolvedMO,
          quantite: qte,
          prixUnitaire: unitPrice,
          tauxRemise: Number(pfMo.tauxRemise ?? 0),
          proformaLineId: pfMo.id
        });
      }
    }

    if (this.lignesMO.length === 0 && this.data && (this.data.lignesMainDoeuvres?.length || this.data.lignesMainDoeuvresProforma?.length || (this.data as any)?.mainDoeuvresProforma?.length)) {
      this.populateMoFromStepData(this.data, false);
    }
  }

  private populateLinesFromStepData(stepBs: StepBonSortieResponseDto, isSavedInBon: boolean): void {
    this.lignesPieces = [];
    this.lignesMO = [];

    // Les PDP, PDG et PDS ne sont PAS ajoutées directement au tableau :
    // on enrichit simplement le cache catalogue (allPieces / piecesPdpList / piecesPdgList)
    // pour que les pièces de data.lignesPieces soient disponibles lors de la sélection.
    const rawPieces: any[] = stepBs.lignesPieces || [];
    for (const l of rawPieces) {
      const pieceId = l.pieceId ?? l.piece?.id ?? null;
      if (!pieceId) continue;
      const rawType = String(l.type || 'PDP').toUpperCase();
      if (rawType !== 'PDP' && rawType !== 'PDG') continue;
      const existing = this.allPieces.find(p => p.id === Number(pieceId));
      if (!existing) {
        const fallbackPiece: PieceDetache = {
          id: Number(pieceId),
          reference: l.referencePiece || l.reference || '',
          designation: l.designationPiece || l.designation || 'Pièce',
          type: rawType as 'PDP' | 'PDG',
          prixUnitaire: Number(l.prixCatalogue ?? l.prix ?? l.prixUnitaire ?? 0),
          statut: 'ACTIF'
        } as any;
        this.allPieces.push(fallbackPiece);
        if (rawType === 'PDP' && !this.piecesPdpList.some(p => p.id === fallbackPiece.id)) {
          this.piecesPdpList.push(fallbackPiece);
        } else if (rawType === 'PDG' && !this.piecesPdgList.some(p => p.id === fallbackPiece.id)) {
          this.piecesPdgList.push(fallbackPiece);
        }
      }
    }

    this.populateMoFromStepData(stepBs, isSavedInBon);
  }

  private populateMoFromStepData(stepBs: StepBonSortieResponseDto, isSavedInBon: boolean): void {
    const rawMO: any[] = (stepBs.lignesMainDoeuvresProforma && stepBs.lignesMainDoeuvresProforma.length > 0)
      ? stepBs.lignesMainDoeuvresProforma
      : (stepBs.lignesMainDoeuvresBS && stepBs.lignesMainDoeuvresBS.length > 0)
      ? stepBs.lignesMainDoeuvresBS
      : (stepBs.lignesMainDoeuvres && stepBs.lignesMainDoeuvres.length > 0)
      ? stepBs.lignesMainDoeuvres
      : (stepBs.mainDoeuvresProforma || []);

    for (const m of rawMO) {
      const moId = m.mainDoeuvreId ?? m.mainDoeuvre?.id ?? null;
      const catalogMO = moId ? this.allMO.find(item => item.id === Number(moId)) : null;
      const qte = Number(m.nbreHeure ?? m.quantite ?? 1) || 1;
      const des = m.descriptionMainDoeuvre || m.designation || m.description || catalogMO?.description || 'Main-d’œuvre';
      const basePrice = Number(m.tarifHoraire ?? m.prix ?? m.prixUnitaire ?? catalogMO?.prix ?? 0);
      const resolvedMO: MainDoeuvreModel = catalogMO || ({
        id: Number(moId || m.id || Date.now()),
        description: des,
        prix: basePrice,
        nbreHeure: qte,
        isArchived: false
      } as MainDoeuvreModel);

      const pfLine = this.findProformaLineForMO(resolvedMO, m);
      const pfPrice = Number(pfLine?.tarifHoraire ?? pfLine?.prix);
      const unitPrice = Number.isFinite(pfPrice) && pfPrice >= 0 ? pfPrice : basePrice;
      const pfRemise = Number(pfLine?.tauxRemise ?? pfLine?.remise ?? pfLine?.pourcentageRemise ?? 0);
      const mRemise = Number(m.tauxRemise ?? m.remise ?? m.pourcentageRemise ?? 0);
      const finalRemise = pfLine != null ? pfRemise : mRemise;

      this.lignesMO.push({
        existingLineId: isSavedInBon ? m.id : undefined,
        isSavedInBon,
        mo: resolvedMO,
        quantite: qte,
        prixUnitaire: unitPrice,
        tauxRemise: finalRemise,
        proformaLineId: pfLine?.id ?? m.proformaLineId ?? undefined
      });
    }
  }

  patchDataWithBon(bon: any): void {
    if (!this.data || !bon) return;
    const b = this.normaliserBon(bon);
    this.data.hasBonDeSortie = true;
    this.data.bonDeSortie = {
      id: b.id,
      reference: b.reference || ('BS #' + b.id),
      numero: b.reference || ('BS #' + b.id),
      statut: b.statut || 'EN_ATTENTE',
      dateSortiePrevue: b.date,
      dateSortieEffective: b.dateValidation || undefined,
      remarques: b.remarque,
      remarque: b.remarque,
      lignesBonDeSortiePieces: b.lignesBonDeSortiePieces || []
    };
  }

  // --- Helpers Proforma pour pré-remplir prix, quantités et remises ---

  isLineFromProforma(line: LignePieceBSItem | LigneMOBSItem): boolean {
    if ('mo' in line) {
      const m = line as LigneMOBSItem;
      return this.findProformaLineForMO(m.mo, m) != null;
    }
    const p = line as LignePieceBSItem;
    if (p.isCustom) {
      return this.findProformaLineForPds(p.designationPds || '', p) != null;
    }
    if (p.piece?.id) {
      return this.findProformaLineForPiece(p.piece.id, (p.type === 'PDG' ? 'PDG' : 'PDP'), p) != null;
    }
    return false;
  }

  private findProformaLineForPiece(pieceId: number, type: 'PDP' | 'PDG', rawL?: any): any | null {
    const lignes = [
      ...(this.data?.lignesPiecesProforma ?? []),
      ...(this.proformaContexte?.lignesPieces ?? []),
      ...((this.proformaContexte as any)?.pieces ?? []),
      ...((this.data?.lignesPiecesProforma == null && this.data?.lignesPiecesBS == null) ? (this.data?.lignesPieces ?? []) : [])
    ];
    if (lignes.length === 0) return null;

    if (rawL && rawL.proformaLineId != null) {
      const byId = lignes.find((l: any) => Number(l.id) === Number(rawL.proformaLineId));
      if (byId) return byId;
    }

    const matching = lignes.filter((l: any) => {
      const id = Number(l.pieceId ?? l.piece?.id);
      const lType = String(l.type ?? l.piece?.type ?? 'PDP').toUpperCase();
      return id === Number(pieceId) && (lType === type || (!l.type && !l.piece?.type));
    });
    return matching[0] || null;
  }

  findAllProformaLinesForPds(designation: string): any[] {
    const normalized = (designation || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    if (!normalized) return [];

    const lignes = [
      ...(this.data?.lignesPiecesProforma ?? []),
      ...(this.proformaContexte?.lignesPieces ?? []),
      ...((this.proformaContexte as any)?.pieces ?? []),
      ...((this.data?.lignesPiecesProforma == null && this.data?.lignesPiecesBS == null) ? (this.data?.lignesPieces ?? []) : [])
    ];
    if (lignes.length === 0) return [];

    return lignes.filter((l: any) => {
      const isPds = l.isCustom || String(l.type || '').toUpperCase() === 'PDS' || (!l.pieceId && !l.piece?.id);
      if (!isPds) return false;
      const des = String(l.designationPds ?? l.designationPiece ?? l.designation ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase();
      return des === normalized;
    });
  }

  private findProformaLineForPds(designation: string, rawL?: any): any | null {
    const normalized = (designation || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    if (!normalized) return null;

    const lignes = [
      ...(this.data?.lignesPiecesProforma ?? []),
      ...(this.proformaContexte?.lignesPieces ?? []),
      ...((this.proformaContexte as any)?.pieces ?? []),
      ...((this.data?.lignesPiecesProforma == null && this.data?.lignesPiecesBS == null) ? (this.data?.lignesPieces ?? []) : [])
    ];
    if (lignes.length === 0) return null;

    if (rawL && rawL.proformaLineId != null) {
      const byId = lignes.find((l: any) => Number(l.id) === Number(rawL.proformaLineId));
      if (byId) return byId;
    }

    const matching = this.findAllProformaLinesForPds(designation);
    if (matching.length === 0) return null;

    if (!rawL || rawL.proformaLineId == null) {
      const usedIds = new Set(
        (this.lignesPieces || [])
          .filter(item => item !== rawL && item.proformaLineId != null)
          .map(item => Number(item.proformaLineId))
      );
      const unused = matching.find((l: any) => !usedIds.has(Number(l.id)));
      if (unused) return unused;
    }

    return matching[0] || null;
  }

  private findProformaLineForMO(mo: MainDoeuvreModel | undefined, rawM?: any): any | null {
    const fromProforma = [
      ...(this.data?.lignesMainDoeuvresProforma ?? []),
      ...(this.proformaContexte?.lignesMainDoeuvres ?? []),
      ...((this.proformaContexte as any)?.lignesMainDoeuvre ?? []),
      ...(this.data?.mainDoeuvresProforma ?? []),
      ...((this.data?.lignesMainDoeuvresProforma == null && this.data?.lignesMainDoeuvresBS == null) ? (this.data?.lignesMainDoeuvres ?? []) : [])
    ];
    if (fromProforma.length === 0) return null;

    if (rawM && rawM.proformaLineId != null) {
      const byId = fromProforma.find((l: any) => Number(l.id) === Number(rawM.proformaLineId));
      if (byId) return byId;
    }

    const rawMoId = Number(rawM?.mainDoeuvreId ?? rawM?.mainDoeuvre?.id ?? rawM?.mo?.id ?? mo?.id ?? 0);
    if (rawMoId) {
      const byMoId = fromProforma.find((l: any) => Number(l.mainDoeuvreId ?? l.mainDoeuvre?.id ?? 0) === rawMoId);
      if (byMoId) return byMoId;
    }

    const moId = Number(mo?.id ?? rawMoId ?? 0);
    const moDesc = String(mo?.description ?? rawM?.descriptionMainDoeuvre ?? rawM?.designation ?? rawM?.nom ?? rawM?.mo?.description ?? '')
      .replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const moCatNom = String(mo?.categorie?.nom ?? rawM?.mo?.categorie?.nom ?? '')
      .replace(/\s+/g, ' ').trim().toLocaleLowerCase();

    return fromProforma.find((l: any) => {
      const id = Number(l.mainDoeuvreId ?? l.mainDoeuvre?.id ?? 0);
      if (id && moId && id === moId) return true;
      if (Number(l.id) === moId) return true;
      const desc = String(l.descriptionMainDoeuvre ?? l.designation ?? l.nom ?? l.mainDoeuvre?.description ?? '')
        .replace(/\s+/g, ' ').trim().toLocaleLowerCase();
      if (moDesc && desc && (desc === moDesc || moDesc.includes(desc) || desc.includes(moDesc))) return true;
      if (moCatNom && desc && (desc === moCatNom || moCatNom.includes(desc) || desc.includes(moCatNom))) return true;
      return false;
    }) || null;
  }

  getDocumentPiecePrice(piece?: PieceDetache | null, type: 'PDP' | 'PDG' = 'PDP'): number | null {
    if (!piece) return null;
    const pfLine = this.findProformaLineForPiece(piece.id, type);
    const pfPrice = pfLine?.prixUnitaire ?? pfLine?.prix ?? pfLine?.prixCatalogue;
    if (pfPrice != null && Number.isFinite(Number(pfPrice))) {
      return Number(pfPrice);
    }
    return piece.prixUnitaire != null && Number.isFinite(Number(piece.prixUnitaire))
      ? Number(piece.prixUnitaire)
      : null;
  }

  // --- Sélections et Ajouts (1. PDP, 2. PDG, 3. PDS, 4. MO) ---

  onPiecePdpSelected(pieceId: any): void {
    if (!pieceId) {
      this.prixAjouterPdp = null;
      this.qteAjouterPdp = 1;
      return;
    }
    const p = this.selectedPiecePdp;
    if (p) {
      const price = this.getDocumentPiecePrice(p, 'PDP');
      this.prixAjouterPdp = price;
      const pfLine = this.findProformaLineForPiece(p.id, 'PDP');
      this.qteAjouterPdp = pfLine?.quantite ? Number(pfLine.quantite) : 1;
    }
  }

  onPiecePdgSelected(pieceId: any): void {
    if (!pieceId) {
      this.prixTotalAjouterPdg = null;
      this.selectedPiecePdgUnitPrice = 0;
      this.qteAjouterPdg = 1;
      return;
    }
    const p = this.selectedPiecePdg;
    if (p) {
      const pfLine = this.findProformaLineForPiece(p.id, 'PDG');
      this.qteAjouterPdg = pfLine?.quantite ? Number(pfLine.quantite) : 1;
      const price = this.getDocumentPiecePrice(p, 'PDG');
      this.selectedPiecePdgUnitPrice = price != null ? Number(price) : 0;
      this.prixTotalAjouterPdg = price != null ? Number(price) : null;
    }
  }

  onQteAjouterPdgChange(): void {
    const selectedPiece = this.selectedPiecePdg;
    const price = this.getDocumentPiecePrice(selectedPiece, 'PDG');
    if (price != null) {
      this.prixTotalAjouterPdg = Number(price) * (this.qteAjouterPdg || 1);
    }
  }

  onMoSelected(moId: any): void {
    if (!moId) {
      this.prixAjouterMO = null;
      this.qteAjouterMO = 1;
      return;
    }
    const m = this.selectedMO;
    if (m) {
      const pfLine = this.findProformaLineForMO(m);
      const price = pfLine?.tarifHoraire ?? pfLine?.prix ?? m.prix ?? (m as any).tarifHoraire ?? null;
      this.prixAjouterMO = price != null ? Number(price) : null;
      this.qteAjouterMO = pfLine?.nbreHeure ? Number(pfLine.nbreHeure) : (m.nbreHeure || 1);
    }
  }

  addPiecePdp(): void {
    if (this.isReadOnly) return;
    this.errorMessage = '';
    if (!this.piecePdpAjouter || this.qteAjouterPdp <= 0) return;
    const p = this.selectedPiecePdp;
    if (!p) return;

    const unitPrice = this.getDocumentPiecePrice(p, 'PDP');
    if (unitPrice == null || Number(unitPrice) < 0) {
      this.errorMessage = 'Le prix de cette PDP doit être renseigné dans le catalogue avant son utilisation.';
      return;
    }

    const qteDemandee = Number(this.qteAjouterPdp) || 1;
    const currentUnsavedQte = this.lignesPieces
      .filter(l => !l.isSavedInBon && !l.isCustom && l.piece?.id === p.id && (l.type === 'PDP' || l.piece?.type === 'PDP'))
      .reduce((sum, l) => sum + (Number(l.quantite) || 0), 0);
    if (p.stockMagasin != null && currentUnsavedQte + qteDemandee > p.stockMagasin) {
      this.errorMessage = `Stock magasin insuffisant pour "${p.designation}" : ${p.stockMagasin} disponible(s).`;
      return;
    }

    const pfLine = this.findProformaLineForPiece(p.id, 'PDP');
    const tauxRemise = Number(pfLine?.tauxRemise ?? pfLine?.remise ?? pfLine?.pourcentageRemise ?? 0) || 0;

    this.lignesPieces.push({
      isSavedInBon: false,
      isCustom: false,
      type: 'PDP',
      piece: p,
      quantite: qteDemandee,
      prixUnitaire: Number(unitPrice),
      tauxRemise,
      proformaLineId: pfLine?.id ? Number(pfLine.id) : undefined
    });

    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.cdr.markForCheck();
  }

  addPiecePdg(): void {
    if (this.isReadOnly) return;
    this.errorMessage = '';
    if (!this.piecePdgAjouter || this.qteAjouterPdg <= 0) return;
    const p = this.selectedPiecePdg;
    if (!p) return;

    const cataloguePrice = this.getDocumentPiecePrice(p, 'PDG');
    const qte = Number(this.qteAjouterPdg) || 1;
    if (cataloguePrice == null && (this.prixTotalAjouterPdg == null || this.prixTotalAjouterPdg < 0)) {
      this.errorMessage = 'Le prix de cette PDG est absent du catalogue. Saisissez un prix unitaire pour cette ligne.';
      return;
    }
    const unitPrice = cataloguePrice != null ? Number(cataloguePrice) : Number(this.prixTotalAjouterPdg);
    const total = unitPrice * qte;
    const pfLine = this.findProformaLineForPiece(p.id, 'PDG');
    const tauxRemise = Number(pfLine?.tauxRemise ?? pfLine?.remise ?? pfLine?.pourcentageRemise ?? 0) || 0;

    this.lignesPieces.push({
      isSavedInBon: false,
      isCustom: false,
      type: 'PDG',
      piece: p,
      quantite: qte,
      prixTotal: total,
      prixUnitaire: unitPrice,
      tauxRemise,
      proformaLineId: pfLine?.id ? Number(pfLine.id) : undefined
    });

    this.piecePdgAjouter = null;
    this.qteAjouterPdg = 1;
    this.prixTotalAjouterPdg = null;
    this.selectedPiecePdgUnitPrice = 0;
    this.cdr.markForCheck();
  }

  onPieceCustomDesignationChange(designation: string): void {
    const pfLine = this.findProformaLineForPds(designation);
    if (pfLine) {
      const qte = Number(pfLine.quantite) || 1;
      const unitPrice = Number(pfLine.prix ?? pfLine.prixUnitaire ?? 0);
      this.pieceCustomQuantite = qte;
      this.pieceCustomPrixTotal = unitPrice * qte;
    }
  }

  onPieceCustomQuantiteChange(): void {
    const pfLine = this.findProformaLineForPds(this.pieceCustomDesignation);
    if (pfLine && (pfLine.prix != null || pfLine.prixUnitaire != null)) {
      const unitPrice = Number(pfLine.prix ?? pfLine.prixUnitaire ?? 0);
      this.pieceCustomPrixTotal = unitPrice * (Number(this.pieceCustomQuantite) || 1);
    }
  }

  addProformaPdsDirectly(pfLine: any): void {
    if (this.isReadOnly || !pfLine) return;
    const added = this.lignesPieces.some(l => l.proformaLineId != null && Number(l.proformaLineId) === Number(pfLine.id));
    if (added) return;

    const qte = Number(pfLine.quantite) || 1;
    const unitPrice = Number(pfLine.prix ?? pfLine.prixUnitaire ?? pfLine.prixCatalogue ?? 0);
    const total = unitPrice * qte;
    const remise = Number(pfLine.tauxRemise ?? pfLine.remise ?? pfLine.pourcentageRemise ?? 0);

    this.lignesPieces.push({
      isSavedInBon: false,
      isCustom: true,
      type: 'PDS',
      designationPds: pfLine.designationPds || pfLine.designationPiece || pfLine.designation || 'Pièce sur demande',
      quantite: qte,
      prixUnitaire: unitPrice,
      prixTotal: total,
      tauxRemise: remise,
      proformaLineId: Number(pfLine.id)
    });
    this.cdr.markForCheck();
  }

  addAllUnaddedProformaPds(): void {
    if (this.isReadOnly) return;
    const pending = [...this.unaddedProformaPds];
    for (const pf of pending) {
      this.addProformaPdsDirectly(pf);
    }
  }

  addPieceCustom(): void {
    if (this.isReadOnly) return;
    this.errorMessage = '';
    if (!this.pieceCustomDesignation.trim()) return;

    const des = this.pieceCustomDesignation.trim();
    const normalizedDesignation = des.replace(/\s+/g, ' ').toLocaleLowerCase();
    const matchingPfLines = this.findAllProformaLinesForPds(des);

    if (matchingPfLines.length > 0) {
      const unaddedMatching = matchingPfLines.filter(pf =>
        !this.lignesPieces.some(l => l.proformaLineId != null && Number(l.proformaLineId) === Number(pf.id))
      );

      if (unaddedMatching.length > 0) {
        // Ajouter TOUTES les lignes proforma correspondantes directement (ex: les 2 "lie" d'un coup)
        for (const pf of unaddedMatching) {
          this.addProformaPdsDirectly(pf);
        }
        this.pieceCustomDesignation = '';
        this.pieceCustomPrixTotal = null;
        this.pieceCustomQuantite = 1;
        this.cdr.markForCheck();
        return;
      }
    }

    if (this.pieceCustomQuantite <= 0) return;
    const qte = Number(this.pieceCustomQuantite) || 1;
    const total = Number(this.pieceCustomPrixTotal) || 0;
    const unitPrice = qte > 0 ? Math.round(total / qte) : 0;

    const existing = this.lignesPieces.find(line =>
      !line.isSavedInBon &&
      line.isCustom &&
      !line.proformaLineId &&
      (line.designationPds || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase() === normalizedDesignation &&
      Math.round(Number(line.prixUnitaire) || 0) === unitPrice &&
      (Number(line.tauxRemise) || 0) === 0
    );

    if (existing) {
      existing.quantite += qte;
      existing.prixUnitaire = unitPrice;
      existing.prixTotal = unitPrice * existing.quantite;
    } else {
      this.lignesPieces.push({
        isSavedInBon: false,
        isCustom: true,
        type: 'PDS',
        designationPds: des,
        prixTotal: total,
        prixUnitaire: unitPrice,
        tauxRemise: 0,
        quantite: qte
      });
    }

    this.pieceCustomDesignation = '';
    this.pieceCustomPrixTotal = null;
    this.pieceCustomQuantite = 1;
    this.cdr.markForCheck();
  }

  addMO(): void {
    if (this.isReadOnly) return;
    this.errorMessage = '';
    if (!this.moAjouter || this.qteAjouterMO <= 0) return;
    const m = this.selectedMO;
    if (!m) return;

    const pfLine = this.findProformaLineForMO(m);
    const unitPrice = this.prixAjouterMO != null && this.prixAjouterMO >= 0
      ? Number(this.prixAjouterMO)
      : Number(pfLine?.tarifHoraire ?? pfLine?.prix ?? m.prix ?? 0);
    const tauxRemise = Number(pfLine?.tauxRemise ?? pfLine?.remise ?? pfLine?.pourcentageRemise ?? 0) || 0;
    const proformaLineId = pfLine ? (Number(pfLine.id ?? pfLine.ligneId) || undefined) : undefined;

    this.lignesMO.push({
      isSavedInBon: false,
      mo: m,
      quantite: Number(this.qteAjouterMO) || 1,
      prixUnitaire: unitPrice,
      tauxRemise,
      proformaLineId
    });

    this.moAjouter = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
    this.cdr.markForCheck();
  }

  onPdgPrixTotalChange(l: LignePieceBSItem): void {
    const q = Number(l.quantite) || 1;
    const tot = l.prixTotal != null ? Number(l.prixTotal) : 0;
    l.prixUnitaire = q > 0 ? Math.round(tot / q) : 0;
    l.isSavedInBon = false;
    this.hasModifiedExistingBon = true;
    this.cdr.markForCheck();
  }

  onPdsPrixTotalChange(l: LignePieceBSItem): void {
    const q = Number(l.quantite) || 1;
    const tot = l.prixTotal != null ? Number(l.prixTotal) : 0;
    l.prixUnitaire = q > 0 ? Math.round(tot / q) : 0;
    l.isSavedInBon = false;
    this.hasModifiedExistingBon = true;
    this.cdr.markForCheck();
  }

  onPieceQuantiteChange(l: LignePieceBSItem): void {
    const q = Number(l.quantite) || 1;
    if (!l.isCustom && (l.type === 'PDG' || l.piece?.type === 'PDG') && l.piece?.prixUnitaire != null) {
      l.prixUnitaire = Number(l.piece.prixUnitaire);
      l.prixTotal = l.prixUnitaire * q;
    } else if (l.isCustom || l.type === 'PDG' || l.piece?.type === 'PDG') {
      if (l.prixTotal != null && l.prixTotal > 0) {
        l.prixUnitaire = q > 0 ? Math.round(l.prixTotal / q) : 0;
      } else if (l.prixUnitaire != null && l.prixUnitaire > 0) {
        l.prixTotal = (l.prixUnitaire || 0) * q;
      }
    }
    l.isSavedInBon = false;
    this.hasModifiedExistingBon = true;
    this.cdr.markForCheck();
  }

  onLineModified(item: { isSavedInBon?: boolean }): void {
    item.isSavedInBon = false;
    this.hasModifiedExistingBon = true;
    this.cdr.markForCheck();
  }

  removePieceItem(item: LignePieceBSItem): void {
    if (this.isReadOnly) return;
    const idx = this.lignesPieces.indexOf(item);
    if (idx !== -1) {
      if (item.existingLineId || item.isSavedInBon) {
        this.hasModifiedExistingBon = true;
      }
      this.lignesPieces.splice(idx, 1);
      this.cdr.markForCheck();
    }
  }

  removeMoItem(item: LigneMOBSItem): void {
    if (this.isReadOnly) return;
    const idx = this.lignesMO.indexOf(item);
    if (idx !== -1) {
      if (item.existingLineId || item.isSavedInBon) {
        this.hasModifiedExistingBon = true;
      }
      this.lignesMO.splice(idx, 1);
      this.cdr.markForCheck();
    }
  }

  formatPiece = (p: any) => {
    if (!p) return '';
    const ref = p.reference ? `${p.reference} — ` : '';
    const des = p.designation || '';
    const price = this.getDocumentPiecePrice(p, p.type === 'PDG' ? 'PDG' : 'PDP');
    const pfLine = this.findProformaLineForPiece(p.id, p.type === 'PDG' ? 'PDG' : 'PDP');
    const prix = price != null ? ` (${price} FCFA)` : '';
    const remVal = Number(pfLine?.tauxRemise ?? pfLine?.remise ?? pfLine?.pourcentageRemise ?? 0);
    const remise = remVal > 0 ? ` (-${remVal}%)` : '';
    const stock = p.stockMagasin != null ? ` [Stock: ${p.stockMagasin}]` : '';
    return `${ref}${des}${prix}${remise}${stock}`;
  };

  formatMO = (m: any) => {
    if (!m) return '';
    const pfLine = this.findProformaLineForMO(m);
    const price = pfLine?.tarifHoraire ?? pfLine?.prix ?? m.prix ?? m.tarifHoraire ?? m.prixUnitaire ?? null;
    const prix = price != null ? ` (${price} FCFA)` : '';
    const remVal = Number(pfLine?.tauxRemise ?? pfLine?.remise ?? pfLine?.pourcentageRemise ?? 0);
    const remise = remVal > 0 ? ` (-${remVal}%)` : '';
    return `${m.description || ''}${prix}${remise}`;
  };

  isBonValide(): boolean {
    const bds = this.fullBonDeSortie || this.data?.bonDeSortie;
    return bds?.statut === 'VALIDE' || bds?.statut === 'LIVRE';
  }

  hasBonDeSortie(): boolean {
    return !!(
      this.fullBonDeSortie?.id ||
      this.data?.bonDeSortie?.id ||
      this.data?.hasBonDeSortie ||
      this.bonsDeSortie.length > 0
    );
  }

  // --- Enregistrement direct dans le Bon de Sortie & Navigation ---

  enregistrerEtContinuer(): void {
    this.sauvegarderBonDeSortie(true);
  }

  sauvegarderBonDeSortie(continuerEnsuite = false): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.isReadOnly) {
      if (continuerEnsuite) {
        this.procederVersAssignation();
      }
      return;
    }

    if (!this.hasAtLeastOneItem) {
      this.errorMessage = "Veuillez ajouter au moins une pièce détachée ou une prestation de main-d'œuvre pour continuer.";
      this.cdr.markForCheck();
      return;
    }

    const existingBonId = this.fullBonDeSortie?.id || this.data?.bonDeSortie?.id || this.bonsDeSortie[0]?.id;
    const unsavedPieces = this.lignesPieces.filter(l => !l.isSavedInBon);
    const unsavedMO = this.lignesMO.filter(m => !m.isSavedInBon);

    // Si toutes les lignes affichées sont déjà enregistrées et non modifiées dans le BS existant
    if (!this.hasModifiedExistingBon && unsavedPieces.length === 0 && unsavedMO.length === 0 && existingBonId) {
      if (continuerEnsuite) {
        this.procederVersAssignation();
      } else {
        this.successMessage = 'Le bon de sortie est déjà à jour.';
        this.cdr.markForCheck();
      }
      return;
    }

    const tauxRemiseInvalide = [...this.lignesPieces, ...this.lignesMO]
      .some(l => !Number.isFinite(Number(l.tauxRemise ?? 0)) || Number(l.tauxRemise ?? 0) < 0 || Number(l.tauxRemise ?? 0) > 100);
    if (tauxRemiseInvalide) {
      this.errorMessage = 'Chaque remise doit être comprise entre 0 et 100 %.';
      this.cdr.markForCheck();
      return;
    }

    const depassementStock = this.lignesPieces.find(l => {
      if (l.isCustom || (l.type !== 'PDP' && l.piece?.type !== 'PDP') || !l.piece || l.piece.stockMagasin == null) {
        return false;
      }
      const qteDemandee = Number(l.quantite) || 0;
      const dejaReserveDansBon = Number(l.savedQuantite) || 0;
      const stockDisponible = Number(l.piece.stockMagasin) + dejaReserveDansBon;
      return qteDemandee > stockDisponible;
    });
    if (depassementStock) {
      const stockDispo = (Number(depassementStock.piece?.stockMagasin) || 0) + (Number(depassementStock.savedQuantite) || 0);
      this.errorMessage = `La quantité pour "${depassementStock.piece?.designation}" (${depassementStock.quantite}) dépasse le stock magasin disponible (${stockDispo}).`;
      this.cdr.markForCheck();
      return;
    }

    const clientId = this.data?.clientId
      || this.loadedOT?.client?.id
      || this.loadedOT?.vehicule?.client?.id
      || this.proformaContexte?.clientId
      || (this.proformaContexte as any)?.client?.id;
    const vehiculeId = this.data?.vehiculeId
      || this.loadedOT?.vehicule?.id
      || (this.loadedOT as any)?.vehiculeId
      || this.proformaContexte?.vehiculeId
      || (this.proformaContexte as any)?.vehicule?.id;
    const ordreReparationId = this.data?.ordreReparationId
      || this.loadedOT?.ordreReparationId
      || this.proformaContexte?.ordreReparationId;

    if (!clientId || !vehiculeId) {
      this.errorMessage = 'Impossible d’identifier le client ou le véhicule associé à cet ordre de travail.';
      this.cdr.markForCheck();
      return;
    }

    // Lors d'un update sur un BS existant, on envoie TOUTES les lignes courantes du BS.
    // Lors d'une création initiale, toutes les lignes sont nouvelles.
    const lignesPiecesPayload = this.lignesPieces.map(l => {
      const qte = Number(l.quantite) || 1;
      let finalPrice = 0;
      if (l.isCustom || l.type === 'PDG' || l.piece?.type === 'PDG') {
        if ((l.type === 'PDG' || l.piece?.type === 'PDG') && l.piece?.prixUnitaire != null) {
          finalPrice = Number(l.piece.prixUnitaire);
        } else if (l.prixTotal != null && qte > 0) {
          finalPrice = Math.round(Number(l.prixTotal) / qte);
        } else if (l.prixUnitaire != null) {
          finalPrice = Number(l.prixUnitaire);
        }
      } else {
        finalPrice = Number(l.prixUnitaire ?? l.piece?.prixUnitaire ?? 0);
      }

      const pieceType: 'PDP' | 'PDG' | 'PDS' = l.isCustom
        ? 'PDS'
        : (l.type === 'PDG' || l.piece?.type === 'PDG' ? 'PDG' : 'PDP');

      const isFromPf = this.isLineFromProforma(l);
      const pfLine = l.isCustom
        ? this.findProformaLineForPds(l.designationPds || '', l)
        : (l.piece?.id ? this.findProformaLineForPiece(l.piece.id, (l.type === 'PDG' ? 'PDG' : 'PDP'), l) : null);
      const remiseVal = isFromPf && pfLine != null
        ? Number(pfLine.tauxRemise ?? pfLine.remise ?? l.tauxRemise ?? 0)
        : Math.max(0, Math.min(100, Number(l.tauxRemise) || 0));

      return {
        id: l.existingLineId ?? undefined,
        pieceId: l.isCustom ? null : (l.piece?.id ?? null),
        type: pieceType,
        designation: l.isCustom ? (l.designationPds || 'Pièce PDS') : (l.piece?.designation || l.designationPds || 'Pièce'),
        quantite: qte,
        prix: finalPrice,
        prixUnitaire: finalPrice,
        tauxRemise: remiseVal,
        remise: remiseVal,
        proformaLineId: l.proformaLineId ?? pfLine?.id ?? undefined
      };
    });

    const lignesMainDoeuvresPayload = this.lignesMO.map(m => {
      const qte = Number(m.quantite) || 1;
      const finalPrice = Number(m.prixUnitaire ?? m.mo?.prix ?? 0);
      const isFromPf = this.isLineFromProforma(m);
      const pfLine = this.findProformaLineForMO(m.mo, m);
      const remiseVal = isFromPf && pfLine != null
        ? Number(pfLine.tauxRemise ?? pfLine.remise ?? m.tauxRemise ?? 0)
        : Math.max(0, Math.min(100, Number(m.tauxRemise) || 0));

      return {
        id: m.existingLineId ?? undefined,
        mainDoeuvreId: m.mo?.id ?? null,
        designation: m.mo?.description || m.mo?.categorie?.nom || 'Main-d’œuvre',
        nbreHeure: qte,
        quantite: qte,
        tarifHoraire: finalPrice,
        prix: finalPrice,
        tauxRemise: remiseVal,
        remise: remiseVal,
        proformaLineId: m.proformaLineId ?? pfLine?.id ?? undefined
      };
    });

    const requestPayload: any = {
      clientId: Number(clientId),
      vehiculeId: Number(vehiculeId),
      ordreReparationId: ordreReparationId ? Number(ordreReparationId) : undefined,
      ordreTravailId: this.otId,
      remarque: this.remarque || '',
      lignesPieces: lignesPiecesPayload,
      lignesMainDoeuvres: lignesMainDoeuvresPayload
    };

    console.log('[DEBUG BS] Payload envoyé au backend (PUT/POST) :', requestPayload);

    this.saving = true;
    this.cdr.markForCheck();

    const saveObs$ = existingBonId
      ? this.bdsService.update(existingBonId, requestPayload)
      : this.bdsService.creer(requestPayload);

    saveObs$.subscribe({
      next: (savedBon) => {
        this.ngZone.run(() => {
          this.saving = false;
          this.hasModifiedExistingBon = false;
          if (savedBon) {
            this.fullBonDeSortie = this.normaliserBon(savedBon);
            this.patchDataWithBon(this.fullBonDeSortie);
          }
          this.successMessage = existingBonId
            ? 'Bon de sortie mis à jour avec succès.'
            : 'Bon de sortie enregistré avec succès.';
          this.cdr.markForCheck();

          if (continuerEnsuite) {
            this.procederVersAssignation();
          } else {
            this.loadData();
          }
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.saving = false;
          this.errorMessage = err.error?.message
            || (typeof err.error === 'string' ? err.error : '')
            || (existingBonId ? 'Erreur lors de la mise à jour du bon de sortie.' : 'Erreur lors de l’enregistrement du bon de sortie.');
          this.cdr.markForCheck();
        });
      }
    });
  }

  // --- Validation du Bon de Sortie & Comparaison Proforma ---

  get comparaisonPiecesProforma(): LigneComparaisonProformaBS[] {
    const proformaPieces: any[] = (this.data?.lignesPiecesProforma && this.data.lignesPiecesProforma.length > 0)
      ? this.data.lignesPiecesProforma
      : (this.data?.lignesPieces || []);
    const bsPieces: LignePieceBSItem[] = this.lignesPieces || [];

    const remainingBs = bsPieces.map((line, idx) => ({
      idx,
      line,
      remaining: Number(line.quantite) || 0
    }));

    const normalizeStr = (s: any) =>
      String(s || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();

    const getPfType = (pf: any): 'PDP' | 'PDG' | 'PDS' => {
      const raw = String(pf.type || '').toUpperCase();
      if (pf.isCustom || raw === 'PDS' || (!pf.pieceId && !pf.piece?.id && raw !== 'PDG' && raw !== 'PDP')) {
        return 'PDS';
      }
      return raw === 'PDG' ? 'PDG' : 'PDP';
    };

    const getBsType = (bs: LignePieceBSItem): 'PDP' | 'PDG' | 'PDS' => {
      if (bs.isCustom || bs.type === 'PDS') return 'PDS';
      return (bs.type === 'PDG' || bs.piece?.type === 'PDG') ? 'PDG' : 'PDP';
    };

    const matchesPfAndBs = (pf: any, pfType: 'PDP' | 'PDG' | 'PDS', bs: LignePieceBSItem): boolean => {
      const bsType = getBsType(bs);
      if (bsType !== pfType) return false;
      if (pfType === 'PDS') {
        const pfDes = normalizeStr(pf.designationPds ?? pf.designationPiece ?? pf.designation);
        const bsDes = normalizeStr(bs.designationPds ?? bs.piece?.designation);
        return !!pfDes && pfDes === bsDes;
      }
      const pfPieceId = Number(pf.pieceId ?? pf.piece?.id ?? 0);
      const bsPieceId = Number(bs.piece?.id ?? 0);
      return pfPieceId > 0 && pfPieceId === bsPieceId;
    };

    const result: LigneComparaisonProformaBS[] = [];

    proformaPieces.forEach((pf, pfIdx) => {
      const pfType = getPfType(pf);
      const pfDesignation = pf.designationPiece || pf.designationPds || pf.designation || 'Pièce';
      const pfReference = pf.referencePiece || pf.reference || '';
      const qteProforma = Number(pf.quantite) || 0;

      // Vérifier s'il existe une autre ligne proforma identique plus loin
      const hasLaterIdenticalPf = proformaPieces.slice(pfIdx + 1).some(laterPf => {
        const laterType = getPfType(laterPf);
        if (laterType !== pfType) return false;
        if (pfType === 'PDS') {
          return normalizeStr(laterPf.designationPds ?? laterPf.designationPiece) === normalizeStr(pfDesignation);
        }
        return Number(laterPf.pieceId ?? laterPf.piece?.id ?? 0) === Number(pf.pieceId ?? pf.piece?.id ?? -1);
      });

      let qteBS = 0;

      // 1. Priorité aux lignes BS liées explicitement par proformaLineId
      if (pf.id != null) {
        for (const entry of remainingBs) {
          if (entry.remaining <= 0) continue;
          if (entry.line.proformaLineId != null && Number(entry.line.proformaLineId) === Number(pf.id)) {
            qteBS += entry.remaining;
            entry.remaining = 0;
          }
        }
      }

      // 2. Correspondance par pieceId (PDP/PDG) ou désignation (PDS)
      for (const entry of remainingBs) {
        if (entry.remaining <= 0) continue;
        if (matchesPfAndBs(pf, pfType, entry.line)) {
          if (hasLaterIdenticalPf) {
            const needed = Math.max(0, qteProforma - qteBS);
            const take = Math.min(entry.remaining, needed);
            qteBS += take;
            entry.remaining -= take;
          } else {
            qteBS += entry.remaining;
            entry.remaining = 0;
          }
        }
      }

      const ecart = qteBS - qteProforma;
      let statut: LigneComparaisonProformaBS['statut'] = 'CONFORME';
      if (qteBS === 0 && qteProforma > 0) {
        statut = 'MANQUANT';
      } else if (qteBS < qteProforma) {
        statut = 'PARTIEL';
      } else if (qteBS > qteProforma) {
        statut = 'SURPLUS';
      }

      result.push({
        key: `pf-${pf.id ?? pfIdx}`,
        type: pfType,
        reference: pfReference,
        designation: pfDesignation,
        qteProforma,
        qteBS,
        ecart,
        statut
      });
    });

    // 3. Lignes ajoutées dans le BS mais absentes de la Proforma
    for (const entry of remainingBs) {
      if (entry.remaining <= 0) continue;
      const bsType = getBsType(entry.line);
      const bsDesignation = entry.line.isCustom
        ? (entry.line.designationPds || 'Pièce PDS')
        : (entry.line.piece?.designation || entry.line.designationPds || 'Pièce');
      const bsReference = entry.line.piece?.reference || '';

      result.push({
        key: `bs-extra-${entry.idx}`,
        type: bsType,
        reference: bsReference,
        designation: bsDesignation,
        qteProforma: 0,
        qteBS: entry.remaining,
        ecart: entry.remaining,
        statut: 'HORS_PROFORMA'
      });
    }

    return result;
  }

  get lignesManquantesOuPartielles(): LigneComparaisonProformaBS[] {
    return this.comparaisonPiecesProforma.filter(c => c.statut === 'MANQUANT' || c.statut === 'PARTIEL');
  }

  get hasPiecesManquantesBS(): boolean {
    return this.lignesManquantesOuPartielles.length > 0;
  }

  get totalQuantiteManquanteBS(): number {
    return this.lignesManquantesOuPartielles.reduce((sum, c) => sum + Math.max(0, c.qteProforma - c.qteBS), 0);
  }

  get totalQuantiteProformaCompare(): number {
    return this.comparaisonPiecesProforma.reduce((sum, c) => sum + c.qteProforma, 0);
  }

  get totalQuantiteBSCompare(): number {
    return this.comparaisonPiecesProforma.reduce((sum, c) => sum + c.qteBS, 0);
  }

  openValidateModal(): void {
    if (!this.canValidateBonDeSortie) return;
    this.showValidateModal = true;
    this.cdr.detectChanges();
  }

  closeValidateModal(): void {
    if (this.validating) return;
    this.showValidateModal = false;
    this.cdr.detectChanges();
  }

  confirmerValidation(): void {
    if (!this.canValidateBonDeSortie) return;
    const bonId = this.fullBonDeSortie?.id || this.data?.bonDeSortie?.id;
    if (!bonId) {
      this.errorMessage = 'Aucun Bon de Sortie trouvé à valider.';
      this.cdr.detectChanges();
      return;
    }

    this.validating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.bdsService.valider(bonId).subscribe({
      next: (validated: any) => {
        this.otService.updateStatut(this.otId, StatutOrdreTravail.TERMINE).pipe(
          catchError(() => of(null))
        ).subscribe(() => {
          this.ngZone.run(() => {
            this.validating = false;
            this.showValidateModal = false;
            const ref = validated?.reference || this.fullBonDeSortie?.reference || ('#' + bonId);
            this.successMessage = `Bon de Sortie ${ref} validé avec succès ! L'Ordre de Travail est maintenant terminé.`;

            if (validated) {
              this.fullBonDeSortie = this.normaliserBon(validated);
              this.patchDataWithBon(validated);
            } else if (this.fullBonDeSortie) {
              this.fullBonDeSortie.statut = 'VALIDE';
              this.patchDataWithBon(this.fullBonDeSortie);
            }
            if (this.data) {
              this.data.statut = StatutOrdreTravail.TERMINE;
            }

            this.loadData();
            this.cdr.detectChanges();
          });
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.validating = false;
          const msg = err.error?.message || (typeof err.error === 'string' ? err.error : '') || err.message || '';
          this.errorMessage = msg || 'Erreur lors de la validation du Bon de Sortie.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  procederVersAssignation(): void {
    this.advancing = false;
    this.loadData();
    this.cdr.detectChanges();
  }
}
