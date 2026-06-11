import { Component, inject, OnInit } from '@angular/core';
import { FactureService } from '../services/facture.service';
import { FactureModel } from '../shared/models/facture.model';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [NgClass],
  templateUrl: './factures.component.html',
})
export class FacturesComponent implements OnInit {
  private service = inject(FactureService);

  factures: FactureModel[] = [];
  filtered: FactureModel[] = [];
  loading = true;
  selectedFacture: FactureModel | null = null;

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  successMessage = '';
  errorMessage = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.factures = data; this.applyFilter(); this.loading = false; },
      error: () => this.loading = false,
    });
  }

  applyFilter() {
    if (!this.searchTerm) { this.filtered = this.factures; this.page = 1; return; }
    const kw = this.searchTerm;
    this.filtered = this.factures.filter(f =>
      f.numero.toLowerCase().includes(kw) ||
      f.clientNom.toLowerCase().includes(kw) ||
      (f.immatriculation ?? '').toLowerCase().includes(kw)
    );
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  openDetail(f: FactureModel) { this.selectedFacture = f; }
  closeDetail() { this.selectedFacture = null; }

  delete(id: number) {
    if (!confirm('Supprimer cette facture ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Facture supprimée.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  downloadPdf(id: number) {
    this.service.downloadPdf(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): FactureModel[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  private notify(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
