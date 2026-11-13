import { ConfirmationService } from '../../shared/components/confirmation/confirmation.service';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, NgClass } from '@angular/common';
import { FactureService } from './facture.service';
import { FactureDetailsViewModel, FactureListModel, FactureModel } from './models/facture.model';
import { ClientService } from '../clients/client.service';
import { LucideSearch, LucidePlus, LucideTrash2, LucideX, LucideDownload, LucideReceipt } from '@lucide/angular';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
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
  imports: [CommonModule, FormsModule, NgClass, PaginationComponent, LucideSearch, LucidePlus, LucideTrash2, LucideX, LucideDownload, LucideReceipt],
  templateUrl: './factures.component.html',
})
export class FacturesComponent extends BasePaginatedComponent implements OnInit {
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

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    this.errorMessage = '';
    const params = {
      ...this.getPageParams(),
      statut: this.filterStatut || undefined,
      dateDebut: this.dateDebut || undefined,
      dateFin: this.dateFin || undefined,
      client: this.filterClient.trim() || undefined,
    };
    this.service.getAll(params).subscribe({
      next: data => {
        const arr = this.applyPageResponse<FactureListModel>(data);
        this.factures = arr;
        this.filtered = arr;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.factures = [];
        this.filtered = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.errorMessage = err?.error?.message || 'Impossible de charger les factures.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilter() {
    this.page = 1;
    this.loadData();
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

  async delete(id: number) {
    if (!await this.confirmation.confirm('Supprimer cette facture ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Facture supprimée.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

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
    this.service.downloadPdf(id, layoutKey).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${id}-${layoutKey === 'AVEC_ENTETE' ? 'avec-entete' : 'sans-entete'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
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
    const date = Array.isArray(d) ? new Date(d[0], (d[1] ?? 1) - 1, d[2] ?? 1) : new Date(d);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
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
    return this.filtered;
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
