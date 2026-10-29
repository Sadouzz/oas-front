import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { LucideEye, LucideLoader2, LucidePlus, LucidePrinter, LucideSearch, LucideX } from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { OrdreReparationService } from '../ordres-reparation/ordre-reparation.service';
import { BonDeLivraison, BonDeLivraisonOrdreContext, BonDeLivraisonService, BonDeSortieDisponible } from './bon-de-livraison.service';

@Component({
  selector: 'app-bons-livraison', standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, PaginationComponent, SearchableSelectComponent,
    LucideEye, LucideLoader2, LucidePlus, LucidePrinter, LucideSearch, LucideX],
  templateUrl: './bons-livraison.component.html',
})
export class BonsLivraisonComponent extends BasePaginatedComponent implements OnInit {
  private api = inject(BonDeLivraisonService);
  private orApi = inject(OrdreReparationService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  bons: BonDeLivraison[] = [];
  ordres: any[] = [];
  ordresPage = 0;
  ordresTotal = 0;
  ordresKeyword = '';
  ordresError = '';
  bonsSortie: BonDeSortieDisponible[] = [];
  contexteOrdre: BonDeLivraisonOrdreContext | null = null;
  ordreId: number | null = null;
  selectedBon: BonDeLivraison | null = null;
  remarque = '';
  appliquerTVA = true;
  loading = false;
  loadingOrdres = false;
  loadingBs = false;
  saving = false;
  loadingDetail = false;
  actionLoading = false;
  showCreateModal = false;
  showDetailModal = false;
  successMessage = '';
  errorMessage = '';
  modalError = '';
  private ordresSearchTimer?: ReturnType<typeof setTimeout>;
  private ordresLoadVersion = 0;
  private contexteLoadVersion = 0;
  private ordreParContexte: any | null = null;

  get canCreate(): boolean {
    return ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT', 'ROLE_AGENT_MAGASIN', 'ROLE_CHEF_ATELIER']
      .includes(this.authService.getRole() ?? '');
  }

  ngOnInit(): void {
    this.loadData();
    const ordreId = Number(this.route.snapshot.queryParamMap.get('ordreId'));
    if (ordreId > 0) this.openCreate(ordreId);
  }

  loadData(): void {
    this.loading = true;
    this.api.list({ page: this.page - 1, size: this.pageSize, keyword: this.searchTerm || undefined }).subscribe({
      next: response => { this.bons = this.applyPageResponse<BonDeLivraison>(response); this.loading = false; },
      error: err => { this.errorMessage = err?.error?.message || 'Impossible de charger les bons de livraison.'; this.loading = false; }
    });
  }

  formatOrdre = (ordre: any): string => `${ordre.numero || 'OR'} · ${ordre.vehicule?.immatriculation || ordre.vehiculeImmatriculation || 'Véhicule'}`;
  get selectedOrdreLabel(): string {
    const ordre = this.ordres.find(o => Number(o.id) === Number(this.ordreId));
    return ordre ? this.formatOrdre(ordre) : `OR #${this.ordreId}`;
  }

  private loadOrdres(keyword: string, page: number, append = false): void {
    const requestVersion = ++this.ordresLoadVersion;
    this.loadingOrdres = true;
    this.ordresError = '';
    this.orApi.getAll({ page, size: 20, search: keyword || undefined }).subscribe({
      next: response => {
        if (requestVersion !== this.ordresLoadVersion) return;
        const data = response?.content ?? response?.data?.content ?? [];
        this.ordres = append ? [...this.ordres, ...data] : data;
        if (this.ordreId && this.ordreParContexte && Number(this.ordreParContexte.id) === Number(this.ordreId)
            && !this.ordres.some(o => Number(o.id) === Number(this.ordreId))) {
          this.ordres.unshift(this.ordreParContexte);
        }
        this.ordresPage = page;
        this.ordresTotal = response?.totalElements ?? response?.data?.totalElements ?? this.ordres.length;
        this.loadingOrdres = false;
      },
      error: err => {
        if (requestVersion !== this.ordresLoadVersion) return;
        this.ordresError = err?.error?.message || 'Impossible de charger les ordres de réparation.';
        this.loadingOrdres = false;
      }
    });
  }

  onOrdreSearch(term: string): void {
    clearTimeout(this.ordresSearchTimer);
    this.ordresSearchTimer = setTimeout(() => {
      this.ordresKeyword = term.trim();
      this.loadOrdres(this.ordresKeyword, 0);
    }, 300);
  }

  loadMoreOrdres(): void {
    if (this.loadingOrdres || this.ordres.length >= this.ordresTotal) return;
    this.loadOrdres(this.ordresKeyword, this.ordresPage + 1, true);
  }

  openCreate(ordreId?: number): void {
    clearTimeout(this.ordresSearchTimer);
    this.ordreId = ordreId ?? null; this.contexteOrdre = null; this.bonsSortie = [];
    this.remarque = ''; this.appliquerTVA = true; this.modalError = ''; this.showCreateModal = true;
    this.ordreParContexte = null;
    this.ordresKeyword = '';
    this.loadOrdres('', 0);
    if (ordreId) {
      this.orApi.getById(ordreId).subscribe({
        next: ordre => {
          if (Number(this.ordreId) !== Number(ordre.id)) return;
          this.ordreParContexte = ordre;
          this.ordres = [ordre, ...this.ordres.filter(o => Number(o.id) !== Number(ordre.id))];
          this.ordresTotal = Math.max(this.ordresTotal, this.ordres.length);
        }
      });
    }
    if (this.ordreId) this.onOrderChange(this.ordreId);
  }
  closeCreate(): void {
    if (this.saving) return;
    clearTimeout(this.ordresSearchTimer);
    this.showCreateModal = false;
    this.modalError = '';
  }
  onOrderChange(id: number | null): void {
    this.ordreId = id; this.contexteOrdre = null; this.bonsSortie = []; this.modalError = '';
    const loadVersion = ++this.contexteLoadVersion;
    if (!id) return;
    this.loadingBs = true;
    this.api.getContexteOrdre(id).subscribe({
      next: contexte => {
        if (loadVersion !== this.contexteLoadVersion) return;
        this.contexteOrdre = contexte;
        this.bonsSortie = contexte.bonsDeSortieValides ?? [];
        this.appliquerTVA = contexte.tvaApplicable ?? true;
        this.loadingBs = false;
      },
      error: err => {
        if (loadVersion !== this.contexteLoadVersion) return;
        this.modalError = err?.error?.message || 'Impossible de charger le contexte de livraison de cet ordre.';
        this.loadingBs = false;
      }
    });
  }
  create(): void {
    if (!this.ordreId || !this.bonsSortie.length || this.contexteOrdre?.bonDeLivraison || this.saving) return;
    this.saving = true; this.modalError = '';
    this.api.create({ ordreReparationId: this.ordreId, appliquerTVA: this.appliquerTVA, remarque: this.remarque || undefined }).subscribe({
      next: () => { this.saving = false; this.showCreateModal = false; this.successMessage = 'Bon de livraison créé.'; this.page = 1; this.loadData(); },
      error: err => { this.saving = false; this.modalError = err?.error?.message || 'La création du bon de livraison a échoué.'; }
    });
  }
  convertirFactureDuContexte(): void {
    const bon = this.contexteOrdre?.bonDeLivraison;
    if (!bon || bon.factureId || this.actionLoading) return;
    this.actionLoading = true;
    this.modalError = '';
    this.api.convertirFacture(bon.id).subscribe({
      next: facture => {
        this.actionLoading = false;
        this.successMessage = `Facture ${facture?.numero || ''} créée depuis le bon ${bon.numero}.`.trim();
        if (this.ordreId) this.onOrderChange(this.ordreId);
        this.loadData();
      },
      error: err => {
        this.actionLoading = false;
        this.modalError = err?.error?.message || 'La conversion en facture a échoué.';
      }
    });
  }
  openDetail(bon: BonDeLivraison): void {
    this.selectedBon = bon;
    this.errorMessage = '';
    this.loadingDetail = true;
    this.showDetailModal = true;
    this.api.getById(bon.id).subscribe({
      next: detail => {
        if (this.selectedBon?.id === bon.id) this.selectedBon = detail;
        this.loadingDetail = false;
      },
      error: err => {
        this.loadingDetail = false;
        this.errorMessage = err?.error?.message || 'Impossible de charger le détail du bon de livraison.';
      }
    });
  }
  closeDetail(): void { this.showDetailModal = false; this.selectedBon = null; this.errorMessage = ''; this.loadingDetail = false; }
  convertFacture(bon: BonDeLivraison): void {
    if (this.actionLoading) return; this.actionLoading = true; this.errorMessage = '';
    this.api.convertirFacture(bon.id).subscribe({ next: result => this.afterAction('Facture créée depuis le bon de livraison.', { factureId: result?.id, factureNumero: result?.numero }), error: err => { this.actionLoading = false; this.errorMessage = err?.error?.message || 'La conversion en facture a échoué.'; } });
  }
  convertNote(bon: BonDeLivraison): void {
    if (this.actionLoading) return; this.actionLoading = true; this.errorMessage = '';
    this.api.convertirNote(bon.id).subscribe({ next: result => this.afterAction('Note de prix créée depuis le bon de livraison.', { noteDePrixId: result?.id, noteDePrixNumero: result?.numero }), error: err => { this.actionLoading = false; this.errorMessage = err?.error?.message || 'La conversion en note de prix a échoué.'; } });
  }
  private afterAction(message: string, update: Partial<BonDeLivraison>): void {
    this.actionLoading = false; this.successMessage = message; this.loadData();
    if (this.selectedBon) this.selectedBon = { ...this.selectedBon, ...update };
  }
  print(bon: BonDeLivraison): void {
    this.api.pdf(bon.id).subscribe({ next: blob => {
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `${bon.numero}.pdf`; link.click(); URL.revokeObjectURL(url);
    }, error: () => this.errorMessage = 'Le PDF du bon de livraison ne peut pas être généré.' });
  }
}
