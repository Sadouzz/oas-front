import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import {
  FacturationHistoriqueItemDto,
  FacturationHistoriqueQueryParams,
  FacturationHistoriqueResponseDto,
  FacturationHistoriqueService,
  TypeHistoriqueFacturation,
} from './facturation-historique.service';
import { PieceDetacheeService } from '../pieces-detachees/piece-detachee.service';
import { FactureService } from '../factures/facture.service';
import { NoteDePrixService } from '../notes-prix/note-de-prix.service';
import { BonDeLivraisonService } from '../bons-livraison/bon-de-livraison.service';
import { AvoirTTCService } from '../avoirs-ttc/avoir-ttc.service';
import { AvoirHTService } from '../avoirs-ht/avoir-ht.service';
import { PdfLayoutDialogService } from '../../shared/components/pdf-layout-dialog/pdf-layout-dialog.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { PieceMouvementListResponse, extractContent, extractPage } from '../../shared/models';

export type FacturationTabKey = 'ALL' | TypeHistoriqueFacturation;

export interface FacturationSectionGroup {
  type: TypeHistoriqueFacturation;
  title: string;
  numeroHeader: string;
  montantHeader: string;
  items: FacturationHistoriqueItemDto[];
}

@Component({
  selector: 'app-historique-facturation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    AlertComponent,
    PaginationComponent,
  ],
  templateUrl: './historique-facturation.component.html',
})
export class HistoriqueFacturationComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private facturationHistoriqueService = inject(FacturationHistoriqueService);
  private pieceService = inject(PieceDetacheeService);
  private factureService = inject(FactureService);
  private noteDePrixService = inject(NoteDePrixService);
  private blService = inject(BonDeLivraisonService);
  private avoirTtcService = inject(AvoirTTCService);
  private avoirHtService = inject(AvoirHTService);
  private pdfLayoutDialog = inject(PdfLayoutDialogService);

  // Formulaire de recherche principal (1 date = journée exacte ; 2 dates = plage)
  filterDateDebut = this.todayIso();
  filterDateFin = '';
  filterClientNumero = '';
  filterKeyword = '';

  // Onglet actif pour la section Facturation
  activeTab: FacturationTabKey = 'ALL';
  facturationPage = 1;
  readonly facturationPageSize = 15;
  facturationTotalElements = 0;
  facturationTotalPages = 1;

  loadingFacturation = false;
  facturationError = '';
  facturationData: FacturationHistoriqueResponseDto | null = null;
  facturationRows: FacturationHistoriqueItemDto[] = [];
  downloadingPdfKey: string | null = null;

  // Section Entrées/Sorties Pièces Détachées
  pieceSerialKeyword = '';
  pieceActionFilter = '';
  piecePage = 1;
  readonly piecePageSize = 10;
  pieceTotalElements = 0;
  pieceTotalPages = 1;
  loadingPieces = false;
  piecesError = '';
  pieceMouvements: PieceMouvementListResponse[] = [];

  private facturationSub?: Subscription;
  private piecesSub?: Subscription;
  private pieceSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private facturationSeq = 0;
  private piecesSeq = 0;

  readonly tabs: { key: FacturationTabKey; label: string }[] = [
    { key: 'ALL', label: 'Tous (5 tableaux)' },
    { key: 'BL', label: 'BL' },
    { key: 'FACTURE', label: 'Factures TTC' },
    { key: 'AVOIR_TTC', label: 'Avoirs TTC' },
    { key: 'NOTE_PRIX', label: 'Notes de prix' },
    { key: 'AVOIR_HT', label: 'Avoirs Note de prix' },
  ];

  readonly sectionMeta: Record<TypeHistoriqueFacturation, { title: string; numeroHeader: string; montantHeader: string }> = {
    BL: { title: 'BL', numeroHeader: 'Numéro BL', montantHeader: 'Total TTC' },
    FACTURE: { title: 'FACTURE', numeroHeader: 'Numéro Facture', montantHeader: 'Total TTC' },
    AVOIR_TTC: { title: 'AVOIR TTC', numeroHeader: 'Numéro Avoir TTC', montantHeader: 'Total TTC' },
    NOTE_PRIX: { title: 'NOTE DE PRIX', numeroHeader: 'Numéro note de prix', montantHeader: 'Montant Total' },
    AVOIR_HT: { title: 'AVOIR NOTE DE PRIX', numeroHeader: 'Numéro avoir NP', montantHeader: 'Montant Total' },
  };

  readonly sectionOrder: TypeHistoriqueFacturation[] = ['BL', 'FACTURE', 'AVOIR_TTC', 'NOTE_PRIX', 'AVOIR_HT'];

  ngOnInit(): void {
    this.pieceSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.piecePage = 1;
      this.loadPieceMouvements();
    });

    this.validerRecherche();
  }

  ngOnDestroy(): void {
    this.facturationSub?.unsubscribe();
    this.piecesSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  validerRecherche(): void {
    this.facturationPage = 1;
    this.piecePage = 1;
    this.loadFacturationHistorique();
    this.loadPieceMouvements();
  }

  reinitialiserRecherche(): void {
    this.filterDateDebut = '';
    this.filterDateFin = '';
    this.filterClientNumero = '';
    this.filterKeyword = '';
    this.pieceSerialKeyword = '';
    this.pieceActionFilter = '';
    this.activeTab = 'ALL';
    this.validerRecherche();
  }

  get periodeLibelle(): string {
    if (this.filterDateDebut && this.filterDateFin) {
      if (this.filterDateDebut === this.filterDateFin) {
        return `la date du ${this.formatIsoDate(this.filterDateDebut)}`;
      }
      return `la période du ${this.formatIsoDate(this.filterDateDebut)} au ${this.formatIsoDate(this.filterDateFin)}`;
    }
    const onlyDate = this.filterDateDebut || this.filterDateFin;
    if (onlyDate) return `la date du ${this.formatIsoDate(onlyDate)}`;
    return 'toutes les dates';
  }

  private formatIsoDate(iso: string): string {
    const parts = iso.split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : iso;
  }

  private buildFacturationParams(): FacturationHistoriqueQueryParams {
    const params: FacturationHistoriqueQueryParams = {
      type: this.activeTab,
      clientNumero: this.filterClientNumero.trim() || undefined,
      keyword: this.filterKeyword.trim() || undefined,
    };

    if (this.filterDateDebut && this.filterDateFin) {
      params.dateDebut = this.filterDateDebut;
      params.dateFin = this.filterDateFin;
    } else if (this.filterDateDebut || this.filterDateFin) {
      params.date = this.filterDateDebut || this.filterDateFin;
    }

    // En mode groupé ('ALL'), on omet page/size pour récupérer les 5 tableaux en un seul appel ;
    // en mode onglet spécifique, on active la pagination serveur.
    if (this.activeTab !== 'ALL') {
      params.page = this.facturationPage - 1;
      params.size = this.facturationPageSize;
    }
    return params;
  }

  loadFacturationHistorique(): void {
    if (this.filterDateDebut && this.filterDateFin && this.filterDateDebut > this.filterDateFin) {
      this.facturationError = 'La date de début doit être antérieure ou égale à la date de fin.';
      this.facturationRows = [];
      this.facturationTotalElements = 0;
      this.facturationTotalPages = 1;
      this.cdr.markForCheck();
      return;
    }

    const seq = ++this.facturationSeq;
    this.loadingFacturation = true;
    this.facturationError = '';
    this.cdr.markForCheck();

    this.facturationSub?.unsubscribe();
    this.facturationSub = this.facturationHistoriqueService.getHistorique(this.buildFacturationParams()).pipe(
      finalize(() => {
        if (seq === this.facturationSeq) {
          this.loadingFacturation = false;
          this.cdr.markForCheck();
        }
      })
    ).subscribe({
      next: (res) => {
        if (seq !== this.facturationSeq) return;
        this.facturationData = res;
        this.facturationRows = res?.evenements ?? [];
        this.facturationTotalElements = res?.totalElements ?? this.facturationRows.length;
        this.facturationTotalPages = Math.max(1, res?.totalPages ?? 1);
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (seq !== this.facturationSeq) return;
        this.facturationRows = [];
        this.facturationTotalElements = 0;
        this.facturationTotalPages = 1;
        this.facturationError = err?.error?.message || "Impossible de charger l'historique des factures TTC et HT.";
        this.cdr.markForCheck();
      },
    });
  }

  loadPieceMouvements(): void {
    let debut: string | undefined;
    let fin: string | undefined;

    const start = this.filterDateDebut || this.filterDateFin;
    const end = this.filterDateFin || this.filterDateDebut;
    if (start && end && start > end) {
      this.piecesError = 'La date de début doit être antérieure ou égale à la date de fin.';
      this.pieceMouvements = [];
      this.pieceTotalElements = 0;
      this.pieceTotalPages = 1;
      this.cdr.markForCheck();
      return;
    }
    if (start) debut = `${start}T00:00:00`;
    if (end) fin = `${end}T23:59:59`;

    const seq = ++this.piecesSeq;
    this.loadingPieces = true;
    this.piecesError = '';
    this.cdr.markForCheck();

    this.piecesSub?.unsubscribe();
    this.piecesSub = this.pieceService.historiqueGlobal(
      this.pieceSerialKeyword.trim() || undefined,
      debut,
      fin,
      undefined,
      undefined,
      this.pieceActionFilter || undefined,
      this.piecePage - 1,
      this.piecePageSize
    ).pipe(
      catchError(err => {
        if (seq === this.piecesSeq) {
          this.piecesError = err?.error?.message || 'Impossible de charger les mouvements de pièces détachées.';
        }
        return of([]);
      }),
      finalize(() => {
        if (seq === this.piecesSeq) {
          this.loadingPieces = false;
          this.cdr.markForCheck();
        }
      })
    ).subscribe(res => {
      if (seq !== this.piecesSeq) return;
      const paged = extractPage<PieceMouvementListResponse>(res);
      if (paged) {
        this.pieceMouvements = paged.content ?? [];
        this.pieceTotalElements = paged.totalElements ?? this.pieceMouvements.length;
        this.pieceTotalPages = Math.max(1, paged.totalPages ?? 1);
      } else {
        const list = extractContent<PieceMouvementListResponse>(res);
        this.pieceMouvements = list;
        this.pieceTotalElements = list.length;
        this.pieceTotalPages = 1;
      }
      this.cdr.markForCheck();
    });
  }

  onPieceSerialInput(val: string): void {
    this.pieceSerialKeyword = val;
    this.pieceSearch$.next(val);
  }

  onPieceActionChange(): void {
    this.piecePage = 1;
    this.loadPieceMouvements();
  }

  onPiecePageChange(page: number): void {
    if (page >= 1 && page <= this.pieceTotalPages && page !== this.piecePage) {
      this.piecePage = page;
      this.loadPieceMouvements();
    }
  }

  setActiveTab(tab: FacturationTabKey): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.facturationPage = 1;
    this.loadFacturationHistorique();
  }

  onFacturationPageChange(page: number): void {
    if (page >= 1 && page <= this.facturationTotalPages && page !== this.facturationPage) {
      this.facturationPage = page;
      this.loadFacturationHistorique();
    }
  }

  get groupedSections(): FacturationSectionGroup[] {
    return this.sectionOrder.map(type => ({
      type,
      ...this.sectionMeta[type],
      items: this.facturationRows.filter(item => item.type === type),
    }));
  }

  get activeSectionMeta(): { title: string; numeroHeader: string; montantHeader: string } {
    if (this.activeTab === 'ALL') return this.sectionMeta.FACTURE;
    return this.sectionMeta[this.activeTab];
  }

  tabCount(tab: FacturationTabKey): number {
    const d = this.facturationData;
    if (!d) return 0;
    switch (tab) {
      case 'ALL': return d.totalOperations ?? 0;
      case 'BL': return d.totalBonsLivraison ?? 0;
      case 'FACTURE': return d.totalFactures ?? 0;
      case 'AVOIR_TTC': return d.totalAvoirsTTC ?? 0;
      case 'NOTE_PRIX': return d.totalNotesDePrix ?? 0;
      case 'AVOIR_HT': return d.totalAvoirsHT ?? 0;
    }
  }

  resolveRoute(item: FacturationHistoriqueItemDto): { commands: string[]; queryParams?: Record<string, any> } {
    switch (item.type) {
      case 'BL':
        return { commands: ['/app/bons-livraison'], queryParams: { detailId: item.id } };
      case 'FACTURE':
        return { commands: ['/app/factures'], queryParams: { detailId: item.id } };
      case 'AVOIR_TTC':
        return { commands: ['/app/avoirs-ttc'], queryParams: { detailId: item.id } };
      case 'NOTE_PRIX':
        return { commands: ['/app/notes-prix'], queryParams: { detailId: item.id } };
      case 'AVOIR_HT':
        return { commands: ['/app/avoirs-ht'], queryParams: { detailId: item.id } };
    }
  }

  async downloadItemPdf(item: FacturationHistoriqueItemDto): Promise<void> {
    const key = `${item.type}-${item.id}`;
    if (this.downloadingPdfKey === key) return;

    const layoutKey = await this.pdfLayoutDialog.chooseLayout();
    if (!layoutKey) return;

    this.downloadingPdfKey = key;
    this.facturationError = '';
    this.cdr.markForCheck();

    let obs$;
    let prefix = 'document';
    switch (item.type) {
      case 'BL':
        obs$ = this.blService.pdf(item.id, layoutKey);
        prefix = 'bon-livraison';
        break;
      case 'FACTURE':
        obs$ = this.factureService.downloadPdf(item.id, layoutKey);
        prefix = 'facture';
        break;
      case 'AVOIR_TTC':
        obs$ = this.avoirTtcService.downloadPdf(item.id, layoutKey);
        prefix = 'avoir-ttc';
        break;
      case 'NOTE_PRIX':
        obs$ = this.noteDePrixService.downloadPdf(item.id, layoutKey);
        prefix = 'note-de-prix';
        break;
      case 'AVOIR_HT':
        obs$ = this.avoirHtService.downloadPdf(item.id, layoutKey);
        prefix = 'avoir-ht';
        break;
    }

    obs$.pipe(
      finalize(() => {
        this.downloadingPdfKey = null;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prefix}_${item.numero || item.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.facturationError = `Impossible de télécharger le PDF (${item.numero}).`;
        this.cdr.markForCheck();
      },
    });
  }

  actionPieceBadgeClass(action?: string | null): string {
    const a = (action || '').toUpperCase();
    if (a.includes('ENTREE') || a.includes('RETOUR')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (a.includes('SORTIE')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (a.includes('AJUST') || a.includes('INVENT')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  statutDocBadgeClass(statut?: string | null): string {
    const s = (statut || '').toUpperCase();
    if (['PAYE', 'PAYEE', 'ACCEPTE', 'FACTURÉ', 'VALIDE'].includes(s)) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (['PARTIEL', 'NOTE DE PRIX', 'EN_ATTENTE'].includes(s)) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (['NON_PAYE', 'REFUSE', 'ANNULE', 'REJETE'].includes(s)) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  exportFacturationCSV(): void {
    if (!this.facturationRows.length) return;
    const headers = [
      'Type',
      'Numéro',
      'Im. automobile',
      'Num client',
      'Nom client',
      'Date',
      'Date Modification',
      'Montant Total (FCFA)',
      'Montant Payé (FCFA)',
      'Reste à payer (FCFA)',
      'Statut',
    ];
    const escape = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = this.facturationRows.map(item => [
      escape(item.typeLabel),
      escape(item.numero),
      escape(item.immatriculation ?? ''),
      escape(item.clientNumero ?? item.clientId ?? ''),
      escape(item.clientNom ?? ''),
      escape(item.dateCreation ? item.dateCreation.slice(0, 19).replace('T', ' ') : ''),
      escape(item.dateModification ? item.dateModification.slice(0, 19).replace('T', ' ') : ''),
      item.montantTotal ?? 0,
      item.montantPaye ?? '',
      item.resteAPayer ?? '',
      escape(item.statut),
    ].join(';'));

    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_facturation_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
