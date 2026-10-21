import { ConfirmationService } from '../../shared/components/confirmation/confirmation.service';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { BonDeReceptionService } from './bon-de-reception.service';
import { BonDeReception } from './models/bon-de-reception.model';
import { NgClass } from '@angular/common';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideTruck } from '@lucide/angular';

@Component({
  selector: 'app-bons-reception',
  imports: [NgClass, PaginationComponent],
  templateUrl: './bons-reception.component.html',
})
export class BonsReceptionComponent extends BasePaginatedComponent implements OnInit {
  private confirmation = inject(ConfirmationService);

  private cdr = inject(ChangeDetectorRef);
  private service = inject(BonDeReceptionService);

  bons: BonDeReception[] = [];
  filtered: BonDeReception[] = [];

  loading = true;
  selectedBon: BonDeReception | null = null;
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getAll(this.getPageParams()).subscribe({
      next: data => {
        const list = this.applyPageResponse<BonDeReception>(data);
        this.bons = list.sort((a: any, b: any) => b.id - a.id);
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.bons = [];
        this.filtered = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilter() {
    this.filtered = this.bons;
  }

  // onSearch is inherited from BasePaginatedComponent

  openDetail(bon: BonDeReception) {
    this.selectedBon = bon;
    this.service.getById(bon.id).subscribe({
      next: detail => {
        if (this.selectedBon?.id === bon.id) {
          this.selectedBon = { ...bon, ...detail };
          this.cdr.markForCheck();
        }
      },
      error: () => this.notifyError('Impossible de charger le détail du bon de réception.'),
    });
  }
  closeDetail() { this.selectedBon = null; }

  async delete(id: number) {
    if (!await this.confirmation.confirm('Supprimer ce bon de réception ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Bon de réception supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  downloadPdf(id: number, layoutKey: 'AVEC_ENTETE' | 'SANS_ENTETE') {
    this.service.downloadPdf(id, layoutKey).subscribe({
      next: blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bon-reception-${id}-${layoutKey === 'AVEC_ENTETE' ? 'avec-entete' : 'sans-entete'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      },
      error: () => this.notifyError('Impossible de télécharger le bon de réception.'),
    });
  }

  get montantBCDetail(): number { return this.selectedBon?.bonDeCommandeMontantTTC ?? 0; }

  statutLabel(statut?: string | null): string {
    const labels: Record<string, string> = { RECU: 'Reçu', INCOMPLET: 'Partiel', ENVOYE: 'En cours', EN_ATTENTE: 'En attente', ANNULE: 'Annulé' };
    return statut ? (labels[statut] ?? statut) : 'Reçu';
  }

  statutClass(statut?: string | null): string {
    if (statut === 'RECU') return 'bg-green-50 text-green-700';
    if (statut === 'INCOMPLET') return 'bg-amber-50 text-amber-700';
    if (statut === 'ANNULE') return 'bg-red-50 text-red-700';
    return 'bg-blue-50 text-blue-700';
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): BonDeReception[] {
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
