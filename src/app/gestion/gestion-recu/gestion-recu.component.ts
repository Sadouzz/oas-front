import { Component, inject, OnInit } from '@angular/core';
import { RecuModel } from '../../shared/models/recu.model';
import { RecuService } from '../../services/recu.service';
import { NgClass } from '@angular/common';
import { LucideSearch, LucideReceipt, LucideDownload } from '@lucide/angular';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-gestion-recu',
  standalone: true,
  imports: [NgClass, LucideSearch, LucideReceipt, PaginationComponent],
  templateUrl: './gestion-recu.component.html'
})
export class GestionRecuComponent implements OnInit {
  private recuService = inject(RecuService);

  recus: RecuModel[] = [];
  filtered: RecuModel[] = [];
  loading = true;

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.recuService.getAll().subscribe({
      next: (data) => {
        this.recus = data;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilter() {
    if (!this.searchTerm) {
      this.filtered = [...this.recus];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filtered = this.recus.filter(r => 
        (r.numero?.toLowerCase().includes(term)) ||
        (r.numeroFacture?.toLowerCase().includes(term)) ||
        (r.clientNom?.toLowerCase().includes(term)) ||
        (r.numeroFicheAtelier?.toLowerCase().includes(term))
      );
    }
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value;
    this.applyFilter();
  }

  get paged(): RecuModel[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }
  
  modePaiementLabel(mp: string | null | undefined): string {
    const m: Record<string, string> = { CHEQUE: 'Chèque', ESPECE: 'Espèces', VIREMENT: 'Virement' };
    return m[mp ?? ''] ?? mp ?? '—';
  }
}
