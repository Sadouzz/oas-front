import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs/operators';
import {
  TypeHistoriqueVehicule,
  VehiculeHistoriqueItemDto,
  VehiculeHistoriqueQueryParams,
  VehiculeHistoriqueResponseDto,
  VehiculeService,
} from '../vehicule.service';
import { BasePaginatedComponent } from '../../../shared/components/base-paginated.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { VehiculeModel } from '../../../shared/models';

export type VehicleHistoryFilterType = 'ALL' | TypeHistoriqueVehicule;

export interface VehicleHistoryRow extends VehiculeHistoriqueItemDto {
  key: string;
  routeLink: string[];
  queryParams?: Record<string, any>;
}

@Component({
  selector: 'app-historique-vehicules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    PaginationComponent,
    AlertComponent,
  ],
  templateUrl: './historique-vehicules.component.html',
})
export class HistoriqueVehiculesComponent extends BasePaginatedComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vehiculeService = inject(VehiculeService);

  override pageSize = 10;

  vehicules: VehiculeModel[] = [];
  selectedVehicule: VehiculeModel | null = null;
  historiqueData: VehiculeHistoriqueResponseDto | null = null;
  historyRows: VehicleHistoryRow[] = [];

  loadingVehicules = false;
  loadingHistory = false;
  errorMessage = '';
  historyErrorMessage = '';

  // Filtres & pagination de l'historique (côté serveur)
  activeType: VehicleHistoryFilterType = 'ALL';
  historySearch = '';
  dateDebut = '';
  dateFin = '';
  historyPage = 1;
  readonly historyPageSize = 15;
  historyTotalElements = 0;
  historyTotalPages = 1;

  private querySub?: Subscription;
  private listSub?: Subscription;
  private historySub?: Subscription;
  private historySearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private historySequence = 0;

  readonly typeTabs: { key: VehicleHistoryFilterType; label: string }[] = [
    { key: 'ALL', label: 'Tout' },
    { key: 'OR', label: 'Ordres de réparation' },
    { key: 'OT', label: 'Ordres de travail' },
    { key: 'FACTURE', label: 'Factures' },
    { key: 'NOTE_PRIX', label: 'Notes de prix' },
    { key: 'BS', label: 'Bons de sortie' },
    { key: 'BL', label: 'Bons de livraison' },
    { key: 'DEVIS', label: 'Devis' },
    { key: 'RDV', label: 'Rendez-vous' },
  ];

  ngOnInit(): void {
    this.historySearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.historyPage = 1;
      this.reloadSelectedHistory();
    });

    this.loadData();
    this.querySub = this.route.queryParams.subscribe(params => {
      const vehiculeId = Number(params['vehiculeId']);
      if (vehiculeId > 0 && this.selectedVehicule?.id !== vehiculeId) {
        this.loadVehiculeAndHistory(vehiculeId);
      }
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    this.listSub?.unsubscribe();
    this.historySub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loadingVehicules = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.listSub?.unsubscribe();
    this.listSub = this.vehiculeService.getAll(this.getPageParams()).pipe(
      finalize(() => {
        this.loadingVehicules = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (res: any) => {
        const list = this.applyPageResponse<VehiculeModel>(res);
        this.vehicules = list.sort((a, b) => b.id - a.id);
        if (!this.selectedVehicule && this.vehicules.length > 0 && !this.route.snapshot.queryParamMap.get('vehiculeId')) {
          this.selectVehicule(this.vehicules[0], false);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.vehicules = [];
        this.errorMessage = 'Impossible de charger la liste des véhicules.';
        this.cdr.markForCheck();
      },
    });
  }

  private loadVehiculeAndHistory(vehiculeId: number): void {
    this.vehiculeService.getById(vehiculeId).pipe(
      catchError(() => of(null))
    ).subscribe(v => {
      if (v) {
        this.selectVehicule(v, false);
      } else {
        this.selectedVehicule = {
          id: vehiculeId,
          immatriculation: '',
          annee: null,
          modele: '',
          marque: '',
          kilometrage: null,
          numeroChassis: '',
          client: null,
          archiveParClient: false,
          actif: true,
          createdAt: '',
        };
        this.historyPage = 1;
        this.loadHistoryForVehicule(vehiculeId);
      }
    });
  }

  selectVehicule(vehicule: VehiculeModel, updateUrl = true): void {
    if (this.selectedVehicule?.id === vehicule.id && this.historiqueData) return;
    this.selectedVehicule = vehicule;
    this.historyPage = 1;
    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { vehiculeId: vehicule.id },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
    this.loadHistoryForVehicule(vehicule.id);
  }

  reloadSelectedHistory(): void {
    const id = this.selectedVehicule?.id ?? this.historiqueData?.vehiculeId;
    if (id) {
      this.loadHistoryForVehicule(id);
    }
  }

  private buildQueryParams(page = this.historyPage - 1, size = this.historyPageSize): VehiculeHistoriqueQueryParams {
    const singleDate = (this.dateDebut && !this.dateFin)
      ? this.dateDebut
      : (!this.dateDebut && this.dateFin ? this.dateFin : '');
    return {
      type: this.activeType,
      keyword: this.historySearch.trim() || undefined,
      dateDebut: singleDate || this.dateDebut || undefined,
      dateFin: singleDate || this.dateFin || undefined,
      page,
      size,
    };
  }

  private loadHistoryForVehicule(vehiculeId: number): void {
    if (this.dateDebut && this.dateFin && this.dateDebut > this.dateFin) {
      this.historyErrorMessage = 'La date de début doit être antérieure ou égale à la date de fin.';
      this.historyRows = [];
      this.historyTotalElements = 0;
      this.historyTotalPages = 1;
      this.cdr.markForCheck();
      return;
    }

    const seq = ++this.historySequence;
    this.loadingHistory = true;
    this.historyErrorMessage = '';
    this.cdr.markForCheck();

    this.historySub?.unsubscribe();
    this.historySub = this.vehiculeService.getHistorique(vehiculeId, this.buildQueryParams()).pipe(
      finalize(() => {
        if (seq === this.historySequence) {
          this.loadingHistory = false;
          this.cdr.markForCheck();
        }
      })
    ).subscribe({
      next: (res) => {
        if (seq !== this.historySequence) return;
        this.historiqueData = res;
        this.historyTotalElements = res.totalElements ?? res.evenements?.length ?? 0;
        this.historyTotalPages = Math.max(1, res.totalPages ?? 1);
        this.historyRows = (res.evenements ?? []).map(item => this.toHistoryRow(item));
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (seq !== this.historySequence) return;
        this.historyRows = [];
        this.historyTotalElements = 0;
        this.historyTotalPages = 1;
        this.historyErrorMessage = err?.error?.message || "Impossible de charger l'historique du véhicule.";
        this.cdr.markForCheck();
      },
    });
  }

  private toHistoryRow(item: VehiculeHistoriqueItemDto): VehicleHistoryRow {
    const { routeLink, queryParams } = this.resolveNavigation(item);
    return {
      ...item,
      key: `${item.type}-${item.id}`,
      routeLink,
      queryParams,
    };
  }

  private resolveNavigation(item: VehiculeHistoriqueItemDto): { routeLink: string[]; queryParams?: Record<string, any> } {
    switch (item.type) {
      case 'OR':
        return { routeLink: ['/app/ordres-reparation', String(item.id)] };
      case 'OT':
        return { routeLink: ['/app/ordres-travail', String(item.id)] };
      case 'FACTURE':
        return { routeLink: ['/app/factures'], queryParams: { detailId: item.id } };
      case 'NOTE_PRIX':
        return { routeLink: ['/app/notes-prix'], queryParams: { detailId: item.id } };
      case 'BS':
        return { routeLink: ['/app/bons-de-sortie'] };
      case 'BL':
        return { routeLink: ['/app/bons-livraison'], queryParams: { detailId: item.id } };
      case 'DEVIS':
        return { routeLink: ['/app/devis-previsionnels'] };
      case 'RDV':
        return { routeLink: ['/app/rendezvous'] };
    }
  }

  setActiveType(type: VehicleHistoryFilterType): void {
    if (this.activeType === type) return;
    this.activeType = type;
    this.historyPage = 1;
    this.reloadSelectedHistory();
  }

  onHistorySearchInput(value: string): void {
    this.historySearch = value;
    this.historySearch$.next(value);
  }

  onHistoryDateChange(): void {
    this.historyPage = 1;
    this.reloadSelectedHistory();
  }

  onHistoryPageChange(page: number): void {
    if (page >= 1 && page <= this.historyTotalPages && page !== this.historyPage) {
      this.historyPage = page;
      this.reloadSelectedHistory();
    }
  }

  resetHistoryFilters(): void {
    this.activeType = 'ALL';
    this.historySearch = '';
    this.dateDebut = '';
    this.dateFin = '';
    this.historyPage = 1;
    this.reloadSelectedHistory();
  }

  get hasHistoryFilters(): boolean {
    return this.activeType !== 'ALL' || !!this.historySearch.trim() || !!this.dateDebut || !!this.dateFin;
  }

  get showMontantColumn(): boolean {
    return this.activeType !== 'OR' && this.activeType !== 'OT' && this.activeType !== 'RDV';
  }

  get displayImmatriculation(): string {
    return this.historiqueData?.immatriculation || this.selectedVehicule?.immatriculation || '—';
  }

  get displayMarqueModele(): string {
    const marque = this.historiqueData?.marque ?? this.selectedVehicule?.marque ?? '';
    const modele = this.historiqueData?.modele ?? this.selectedVehicule?.modele ?? '';
    return `${marque} ${modele}`.trim() || '—';
  }

  get displayAnnee(): number | null {
    return this.historiqueData?.annee ?? this.selectedVehicule?.annee ?? null;
  }

  get displayChassis(): string | null {
    return this.historiqueData?.numeroChassis ?? this.selectedVehicule?.numeroChassis ?? null;
  }

  get displayKilometrage(): number | null {
    return this.historiqueData?.kilometrage ?? this.selectedVehicule?.kilometrage ?? null;
  }

  get displayClientNom(): string {
    if (this.historiqueData?.clientNom) return this.historiqueData.clientNom;
    const c = this.selectedVehicule?.client;
    if (c) {
      const full = `${c.firstName || ''} ${c.lastName || ''}`.trim();
      if (full) return full;
    }
    return '—';
  }

  get displayClientTelephone(): string | null {
    return this.historiqueData?.clientTelephone ?? this.selectedVehicule?.client?.phone ?? null;
  }

  get displayClientNumero(): string {
    const matricule = this.selectedVehicule?.client?.matricule;
    if (matricule && matricule.trim()) return matricule.trim();
    const cid = this.historiqueData?.clientId ?? this.selectedVehicule?.client?.id;
    return cid != null ? String(cid) : '—';
  }

  countByType(type: VehicleHistoryFilterType): number {
    const d = this.historiqueData;
    if (!d) return 0;
    switch (type) {
      case 'ALL': return d.totalOperations ?? 0;
      case 'OR': return d.totalOrdresReparation ?? 0;
      case 'OT': return d.totalOrdresTravail ?? 0;
      case 'FACTURE': return d.totalFactures ?? 0;
      case 'NOTE_PRIX': return d.totalNotesDePrix ?? 0;
      case 'BS': return d.totalBonsSortie ?? 0;
      case 'BL': return d.totalBonsLivraison ?? 0;
      case 'DEVIS': return d.totalDevis ?? 0;
      case 'RDV': return d.totalRendezVous ?? 0;
    }
  }

  get totalFactureEtNotes(): number {
    return Number(this.historiqueData?.montantTotalFacture ?? 0);
  }

  get totalResteAPayer(): number {
    return Number(this.historiqueData?.resteAPayer ?? 0);
  }

  typeBadgeClass(type: TypeHistoriqueVehicule): string {
    switch (type) {
      case 'OR': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'OT': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'FACTURE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'NOTE_PRIX': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BS': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'BL': return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'DEVIS': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'RDV': return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  statutBadgeClass(statut: string): string {
    const s = (statut || '').toUpperCase();
    if (['PAYE', 'PAYEE', 'LIVRE', 'VALIDE', 'TERMINE', 'CONFIRME', 'ACCEPTE', 'FACTURÉ'].includes(s)) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (['PARTIEL', 'PARTIELLEMENT_PAYEE', 'EN_COURS', 'NOTE DE PRIX'].includes(s)) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (['NON_PAYE', 'REFUSE', 'ANNULE', 'ANNULEE', 'REJETE'].includes(s)) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  exportCSV(): void {
    const id = this.selectedVehicule?.id ?? this.historiqueData?.vehiculeId;
    if (!id || this.historyTotalElements === 0) return;

    if (this.historyTotalElements > this.historyRows.length) {
      this.vehiculeService.getHistorique(id, this.buildQueryParams(0, Math.min(500, this.historyTotalElements)))
        .pipe(catchError(() => of(null)))
        .subscribe(res => {
          const rows = res?.evenements ?? this.historyRows;
          this.downloadCsvRows(rows);
        });
      return;
    }

    this.downloadCsvRows(this.historyRows);
  }

  private downloadCsvRows(rowsToExport: VehiculeHistoriqueItemDto[]): void {
    if (!rowsToExport.length) return;
    const headers = [
      'Type',
      'Numéro',
      'Im. automobile',
      'Num client',
      'Nom client',
      'Date',
      'Statut',
      'Description',
      'Détails',
      'Montant (FCFA)',
      'Montant payé (FCFA)',
      'Reste à payer (FCFA)',
    ];
    const escape = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const immat = this.displayImmatriculation;
    const numClient = this.displayClientNumero;
    const nomClient = this.displayClientNom;

    const rows = rowsToExport.map(item => [
      escape(item.typeLabel),
      escape(item.numero),
      escape(immat),
      escape(numClient),
      escape(nomClient),
      escape(item.date ? item.date.slice(0, 19).replace('T', ' ') : ''),
      escape(item.statut),
      escape(item.description),
      escape(item.meta ?? ''),
      item.montant != null ? item.montant : '',
      item.montantPaye != null ? item.montantPaye : '',
      item.resteAPayer != null ? item.resteAPayer : '',
    ].join(';'));

    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeImmat = (immat || 'vehicule').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `historique_${safeImmat}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
