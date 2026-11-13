import { ConfirmationService } from '../../shared/components/confirmation/confirmation.service';
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, NgClass } from '@angular/common';
import { catchError, finalize, of, Subscription } from 'rxjs';
import { FactureService } from './facture.service';
import { FactureDetailsViewModel, FactureListModel, FactureModel } from './models/facture.model';
import { ClientService } from '../clients/client.service';
import { LucideSearch, LucidePlus, LucideX, LucideDownload, LucideReceipt, LucideEye } from '@lucide/angular';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { extractContent } from '../../shared/models';
import { FiscalConfigurationService } from '../gestion-tva/fiscal-configuration.service';
import { modePaiementRecu } from './models/facture-mode-paiement';
import { PdfLayoutDialogService } from '../../shared/components/pdf-layout-dialog/pdf-layout-dialog.service';
import {
  EnrichableLignePiece,
  PieceLigneType,
  pieceTypeBadgeClass,
  resolvePieceDesignation,
  resolvePieceType,
} from '../../shared/utils/piece-ligne.util';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, FormsModule, NgClass, PaginationComponent, LucideSearch, LucidePlus, LucideX, LucideDownload, LucideReceipt, LucideEye],
  templateUrl: './factures.component.html',
})
export class FacturesComponent extends BasePaginatedComponent implements OnInit, OnDestroy {
  private confirmation = inject(ConfirmationService);

  private cdr = inject(ChangeDetectorRef);
  private service = inject(FactureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientService = inject(ClientService);
  private fiscalConfigurationService = inject(FiscalConfigurationService);
  private pdfLayoutDialog = inject(PdfLayoutDialogService);
  timbreFiscalRate = 1;

  factures: FactureListModel[] = [];
  filtered: FactureListModel[] = [];
  loading = true;
  selectedFacture: FactureDetailsViewModel | null = null;
  selectedFactureLoading = false;

  showPayModal = false;
  factureToPay: FactureListModel | null = null;
  payMontant = 0;
  payMethode = 'ESPECE';
  paySaving = false;
  walletBalance: number | null = null;


  get payMaxMontant(): number {
    if (!this.factureToPay) return 0;
    return this.payMethode === 'SOLDE_PREPAYE' && this.walletBalance !== null
      ? Math.min(this.factureToPay.resteAPayer, this.walletBalance)
      : this.factureToPay.resteAPayer;
  }

  get payTimbreEspeces(): number {
    const rate = Number(this.factureToPay?.timbreFiscalRate ?? this.timbreFiscalRate);
    const timbreDejaInclus = this.factureToPay?.tvaApplicable === false
      && Number(this.factureToPay?.montantTimbre ?? 0) > 0;
    return this.payMethode === 'ESPECE' && !timbreDejaInclus
      ? Math.round((Number(this.payMontant) || 0) * rate) / 100
      : 0;
  }

  get payTotalEncaisse(): number {
    return (Number(this.payMontant) || 0) + this.payTimbreEspeces;
  }

  searchNumero = '';
  searchImmatriculation = '';
  searchClientNumero = '';
  clientMatriculeById: Record<number, string> = {};
  private searchDebounce: any = null;
  private loadSub?: Subscription;
  private destroyed = false;

  filterStatut = '';
  dateDebut = '';
  dateFin = '';
  filterClient = '';
  showDateFilter = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.fiscalConfigurationService.getCurrent().subscribe({
      next: config => { this.timbreFiscalRate = Number(config.timbreFiscalRate) || 0; },
      error: () => undefined,
    });
    this.clientService.getAll({ size: 500 }).pipe(catchError(() => of([]))).subscribe({
      next: res => {
        const map: Record<number, string> = {};
        for (const client of extractContent<any>(res as any)) {
          if (client?.id != null && client?.matricule) {
            map[Number(client.id)] = String(client.matricule);
          }
        }
        this.clientMatriculeById = map;
        if (this.searchClientNumero.trim() || this.filterClient.trim()) {
          this.applyFilter();
        }
        if (!this.destroyed) this.cdr.markForCheck();
      },
    });
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.router.navigate(['/app/bons-livraison']);
        return;
      }
      if (params['statut']) {
        this.filterStatut = params['statut'];
      } else {
        this.filterStatut = '';
      }
      this.showDateFilter = params['search'] === 'client-date';
      this.page = 1;
      this.loadData();

      if (params['detailId']) {
        const detailId = Number(params['detailId']);
        if (Number.isFinite(detailId) && detailId > 0) {
          this.openDetailById(detailId);
        }
      }
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.loadSub?.unsubscribe();
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  get hasActiveFilters(): boolean {
    return Boolean(
      this.searchTerm ||
      this.searchNumero.trim() ||
      this.searchImmatriculation.trim() ||
      this.searchClientNumero.trim() ||
      this.filterClient.trim() ||
      this.filterStatut ||
      this.dateDebut ||
      this.dateFin
    );
  }

  override get totalPages(): number {
    return this.hasActiveFilters
      ? (Math.ceil(this.filtered.length / this.pageSize) || 1)
      : super.totalPages;
  }

  get displayTotalElements(): number {
    return this.hasActiveFilters ? this.filtered.length : this.totalElements;
  }

  loadData() {
    this.load();
  }

  load() {
    this.loadSub?.unsubscribe();
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const numero = this.searchNumero.trim();
    const immatriculation = this.searchImmatriculation.trim();
    const clientNumero = this.searchClientNumero.trim();
    const clientExtra = this.filterClient.trim();
    const effectiveKeyword = this.searchTerm || numero || immatriculation || undefined;
    const isFiltering = this.hasActiveFilters;

    const params: Record<string, any> = {
      ...this.getPageParams({
        page: isFiltering ? 0 : this.page - 1,
        size: isFiltering ? 1000 : this.pageSize,
      }),
      ...(effectiveKeyword ? { keyword: effectiveKeyword } : {}),
      ...(numero ? { numero } : {}),
      ...(immatriculation ? { immatriculation } : {}),
      ...(clientNumero ? { clientNumero, client: clientNumero } : {}),
      ...(/^\d+$/.test(clientNumero) ? { clientId: Number(clientNumero) } : {}),
      ...(clientExtra && !clientNumero ? { client: clientExtra } : {}),
      ...(this.filterStatut ? { statut: this.filterStatut } : {}),
      ...(this.dateDebut ? { dateDebut: this.dateDebut } : {}),
      ...(this.dateFin ? { dateFin: this.dateFin } : {}),
    };

    this.loadSub = this.service.getAll(params).pipe(
      finalize(() => {
        this.loading = false;
        if (!this.destroyed) this.cdr.detectChanges();
      })
    ).subscribe({
      next: data => {
        try {
          const arr = this.applyPageResponse<FactureListModel>(data);
          this.factures = (Array.isArray(arr) ? [...arr] : []).sort((a: any, b: any) => (b?.id ?? 0) - (a?.id ?? 0));
          this.applyFilter();
        } catch {
          this.factures = [];
          this.filtered = [];
        } finally {
          this.loading = false;
          if (!this.destroyed) this.cdr.detectChanges();
        }
      },
      error: err => {
        this.factures = [];
        this.filtered = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.errorMessage = err?.error?.message || 'Impossible de charger les factures.';
        this.loading = false;
        if (!this.destroyed) this.cdr.detectChanges();
      },
    });
  }

  triggerSearch(immediate = false) {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
    this.page = 1;
    if (immediate) {
      this.loadData();
      return;
    }
    this.searchDebounce = setTimeout(() => {
      this.searchDebounce = null;
      this.loadData();
    }, 300);
  }

  resetFilters() {
    this.searchNumero = '';
    this.searchImmatriculation = '';
    this.searchClientNumero = '';
    this.searchTerm = '';
    this.filterStatut = '';
    this.dateDebut = '';
    this.dateFin = '';
    this.filterClient = '';
    this.page = 1;
    this.loadData();
  }

  clientNumeroLabel(f: FactureListModel | FactureDetailsViewModel): string {
    const anyFacture = f as any;
    const matricule = f.clientNumero ?? f.numeroClient ?? f.clientMatricule ?? anyFacture?.client?.matricule ?? (f.clientId != null ? this.clientMatriculeById[f.clientId] : undefined);
    if (matricule != null && String(matricule).trim()) return String(matricule).trim();
    const cid = f.clientId ?? anyFacture?.client?.id;
    if (cid != null) return String(cid);
    return '—';
  }

  immatriculationLabel(f: FactureListModel | FactureDetailsViewModel): string {
    const anyFacture = f as any;
    return String(f.immatriculation ?? f.vehiculeImmatriculation ?? anyFacture?.vehicule?.immatriculation ?? '').trim() || '—';
  }

  applyFilter() {
    let data = this.factures || [];
    if (this.filterStatut === 'EN_COURS') {
      data = data.filter(f => f.statutPaiement !== 'PAYE');
    } else if (this.filterStatut === 'PAYE') {
      data = data.filter(f => f.statutPaiement === 'PAYE');
    }
    if (this.searchNumero.trim()) {
      const q = this.searchNumero.trim().toLowerCase();
      data = data.filter(f => String(f.numero ?? '').toLowerCase().includes(q));
    }
    if (this.searchImmatriculation.trim()) {
      const q = this.searchImmatriculation.trim().toLowerCase();
      data = data.filter(f => {
        const anyFacture = f as any;
        const immat = String(f.immatriculation ?? f.vehiculeImmatriculation ?? anyFacture?.vehicule?.immatriculation ?? '').toLowerCase();
        return immat.includes(q);
      });
    }
    if (this.searchClientNumero.trim()) {
      const q = this.searchClientNumero.trim().toLowerCase();
      data = data.filter(f => {
        const anyFacture = f as any;
        const cid = f.clientId ?? anyFacture?.client?.id;
        return (
          String(f.clientNumero ?? '').toLowerCase().includes(q) ||
          String(f.numeroClient ?? '').toLowerCase().includes(q) ||
          String(f.clientMatricule ?? anyFacture?.client?.matricule ?? '').toLowerCase().includes(q) ||
          (cid != null ? String(this.clientMatriculeById[cid] ?? '').toLowerCase().includes(q) : false) ||
          String(cid ?? '').toLowerCase().includes(q) ||
          String(f.clientNom ?? '').toLowerCase().includes(q)
        );
      });
    }
    if (this.searchTerm) {
      const kw = String(this.searchTerm).toLowerCase();
      data = data.filter(f => {
        const anyFacture = f as any;
        const immat = String(f.immatriculation ?? f.vehiculeImmatriculation ?? anyFacture?.vehicule?.immatriculation ?? '').toLowerCase();
        return (
          String(f.numero ?? '').toLowerCase().includes(kw) ||
          String(f.clientNom ?? '').toLowerCase().includes(kw) ||
          immat.includes(kw) ||
          this.clientNumeroLabel(f).toLowerCase().includes(kw) ||
          String(f.clientId ?? '').includes(kw)
        );
      });
    }
    if (this.dateDebut) {
      data = data.filter(f => {
        const d = this.getDateString(f.dateCreation);
        return d ? d >= this.dateDebut : false;
      });
    }
    if (this.dateFin) {
      data = data.filter(f => {
        const d = this.getDateString(f.dateCreation);
        return d ? d <= this.dateFin : false;
      });
    }
    if (this.filterClient) {
      const cKw = this.filterClient.toLowerCase();
      data = data.filter(f =>
        String(f.clientNom ?? '').toLowerCase().includes(cKw) ||
        this.clientNumeroLabel(f).toLowerCase().includes(cKw) ||
        String(f.clientId ?? '').includes(cKw)
      );
    }
    this.filtered = data;
    const maxPages = Math.ceil(this.filtered.length / this.pageSize) || 1;
    if (this.hasActiveFilters && this.page > maxPages) {
      this.page = 1;
    }
  }

  private getDateString(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') return d.slice(0, 10);
    if (Array.isArray(d)) {
      const [year, month, day] = d;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '';
  }

  onStatutFilter(e: Event) {
    this.filterStatut = (e.target as HTMLSelectElement).value;
    this.page = 1;
    this.loadData();
  }

  // onSearch is inherited from BasePaginatedComponent

  openCreate() {
    this.router.navigate(['/app/bons-livraison']);
  }

  // ── Detail ──────────────────────────────────────────────────────

  openDetail(f: FactureListModel) {
    this.selectedFacture = {
      ...f,
      lignesPieces: [],
      lignesMainDoeuvres: [],
      recus: [],
    };
    this.fetchDetail(f.id);
  }

  openDetailById(id: number) {
    this.selectedFacture = {
      id,
      numero: 'Chargement…',
      dateCreation: '',
      montantHT: 0,
      montantTVA: 0,
      montantTTC: 0,
      montantTimbre: 0,
      montantAutre: 0,
      montantTotal: 0,
      montantPaye: 0,
      resteAPayer: 0,
      statutPaiement: 'NON_PAYE',
      agentNom: '',
      remarque: null,
      kilometrage: 0,
      clientId: 0,
      clientNom: '',
      immatriculation: null,
      marque: null,
      modele: null,
      annee: null,
      lignesPieces: [],
      lignesMainDoeuvres: [],
      recus: [],
    };
    this.fetchDetail(id);
  }

  private fetchDetail(id: number) {
    this.selectedFactureLoading = true;
    this.cdr.markForCheck();
    this.service.getById(id).subscribe({
      next: detail => {
        if (this.selectedFacture?.id !== id) return;
        this.applyFactureDetail(detail);
      },
      error: err => {
        if (this.selectedFacture?.id !== id) return;
        this.selectedFacture = null;
        this.selectedFactureLoading = false;
        this.errorMessage = err?.error?.message || 'Impossible de charger le détail de cette facture.';
        this.cdr.markForCheck();
      },
    });
  }

  private applyFactureDetail(detail: FactureModel) {
    this.selectedFacture = {
      ...detail,
      lignesPieces: detail.lignesPieces ?? [],
      lignesMainDoeuvres: detail.lignesMainDoeuvres ?? [],
      recus: detail.recus ?? [],
    };
    this.selectedFactureLoading = false;
    this.cdr.markForCheck();
  }

  pieceDesignation(l: EnrichableLignePiece): string {
    return resolvePieceDesignation(l);
  }

  pieceType(l: EnrichableLignePiece): PieceLigneType {
    return resolvePieceType(l);
  }

  pieceTypeClass(l: EnrichableLignePiece): string {
    return pieceTypeBadgeClass(this.pieceType(l));
  }
  closeDetail() { this.selectedFacture = null; this.selectedFactureLoading = false; }

  // ── Payment ─────────────────────────────────────────────────────

  openPayModal(f: FactureListModel) {
    this.factureToPay = f;
    this.payMontant = f.resteAPayer;
    this.payMethode = modePaiementRecu(f.modePaiement);
    this.walletBalance = null;
    this.showPayModal = true;
    this.clientService.getPortefeuille(f.clientId).subscribe({
      next: wallet => { this.walletBalance = wallet.solde; this.cdr.markForCheck(); },
      error: () => { this.walletBalance = 0; this.cdr.markForCheck(); },
    });
  }

  closePayModal() {
    this.showPayModal = false;
    this.factureToPay = null;
    this.paySaving = false;
    this.walletBalance = null;
  }

  submitPayment() {
    if (!this.factureToPay || this.paySaving) return;
    if (this.payMontant <= 0 || this.payMontant > this.factureToPay.resteAPayer) {
      this.notifyError('Montant invalide');
      return;
    }
    if (this.payMethode === 'SOLDE_PREPAYE' && (this.walletBalance === null || this.payMontant > this.walletBalance)) {
      this.notifyError(this.walletBalance === null ? 'Le solde prépayé est en cours de chargement.' : 'Le montant dépasse le solde prépayé disponible.');
      return;
    }

    this.paySaving = true;
    const factureId = this.factureToPay.id;
    this.service.payFacture(factureId, this.payMontant, this.payMethode).subscribe({
      next: () => {
        this.paySaving = false;
        this.closePayModal();
        this.load();
        this.notify('Paiement enregistré avec succès !');
        if (this.selectedFacture?.id === factureId) {
          this.service.getById(factureId).subscribe(updated => {
            if (this.selectedFacture?.id !== factureId) return;
            this.applyFactureDetail(updated);
          });
        }
      },
      error: (err: any) => {
        this.paySaving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.notifyError(msg || 'Erreur lors du paiement.');
      }
    });
  }

  async downloadPdf(id: number) {
    const layoutKey = await this.pdfLayoutDialog.chooseLayout();
    if (!layoutKey) return;
    this.service.downloadPdf(id, layoutKey).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facture-${id}-${layoutKey === 'AVEC_ENTETE' ? 'avec-entete' : 'sans-entete'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        this.notifyError(err?.error?.message || 'Erreur lors du téléchargement du PDF.');
      },
    });
  }

  modePaiementLabel(mp: string | null | undefined): string {
    const m: Record<string, string> = {
      CHEQUE: 'Chèque', ESPECE: 'Espèces', VIREMENT: 'Virement', SOLDE_PREPAYE: 'Solde prépayé',
      ESPECE_TTC: 'Espèces TTC', CHEQUE_TTC: 'Chèque TTC', ESPECE_HT: 'Espèces HT', CHEQUE_HT: 'Chèque HT',
      WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', CARTE_BANCAIRE: 'Carte bancaire', CARTE: 'Carte', AUTRE: 'Autre',
    };
    return m[mp ?? ''] ?? mp ?? '—';
  }

  formatDate(d: string | number[] | null | undefined): string {
    if (!d) return '—';
    try {
      if (Array.isArray(d)) {
        const [year, month, day, hour, minute, second] = d;
        const datePart = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        if (hour !== undefined && minute !== undefined) {
          const secPart = second !== undefined ? `:${String(second).padStart(2, '0')}` : '';
          return `${datePart} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}${secPart}`;
        }
        return datePart;
      }
      const raw = String(d);
      const parsed = new Date(d);
      if (Number.isNaN(parsed.getTime())) return raw;
      if (raw.includes('T') || /\d{2}:\d{2}/.test(raw)) {
        return parsed.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      }
      return parsed.toLocaleDateString('fr-FR');
    } catch {
      return String(d);
    }
  }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  remiseGeneraleFacture(facture: FactureDetailsViewModel): number {
    const remisePieces = (facture.lignesPieces ?? []).reduce((total, ligne) => {
      const brut = (Number(ligne.quantite) || 0) * (Number(ligne.prix) || 0);
      const net = Number.isFinite(Number(ligne.montantTotal))
        ? Number(ligne.montantTotal)
        : Math.round(brut * (1 - (Number(ligne.tauxRemise) || 0) / 100));
      return total + brut - net;
    }, 0);
    const remiseMainDoeuvre = (facture.lignesMainDoeuvres ?? []).reduce((total, ligne) => {
      const brut = (Number(ligne.nbreHeure) || 0) * (Number(ligne.tarifHoraire) || 0);
      const net = Number.isFinite(Number(ligne.montantTotal))
        ? Number(ligne.montantTotal)
        : Math.round(brut * (1 - (Number(ligne.tauxRemise) || 0) / 100));
      return total + brut - net;
    }, 0);
    return remisePieces + remiseMainDoeuvre;
  }

  get paged(): FactureListModel[] {
    if (!this.hasActiveFilters) return this.filtered;
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  private notify(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
