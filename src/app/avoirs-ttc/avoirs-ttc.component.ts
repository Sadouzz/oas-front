import { Component, inject, OnInit } from '@angular/core';
import { AvoirTTCService, AvoirTTC } from '../services/avoir-ttc.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-avoirs-ttc',
  standalone: true,
  imports: [NgClass],
  templateUrl: './avoirs-ttc.component.html',
})
export class AvoirsTTCComponent implements OnInit {
  private service = inject(AvoirTTCService);

  avoirs: AvoirTTC[] = [];
  filtered: AvoirTTC[] = [];
  loading = true;
  selectedAvoir: AvoirTTC | null = null;

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  successMessage = '';
  errorMessage = '';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.avoirs = data; this.applyFilter(); this.loading = false; },
      error: () => this.loading = false,
    });
  }

  applyFilter() {
    if (!this.searchTerm) { this.filtered = this.avoirs; this.page = 1; return; }
    const kw = this.searchTerm;
    this.filtered = this.avoirs.filter(a =>
      a.numero.toLowerCase().includes(kw) ||
      a.clientNom.toLowerCase().includes(kw) ||
      (a.immatriculation ?? '').toLowerCase().includes(kw)
    );
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  openDetail(a: AvoirTTC) { this.selectedAvoir = a; }
  closeDetail() { this.selectedAvoir = null; }

  delete(id: number) {
    if (!confirm('Supprimer cet avoir TTC ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Avoir supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  downloadPdf(id: number) {
    this.service.downloadPdf(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `avoir-ttc-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): AvoirTTC[] {
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
