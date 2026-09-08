import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriePieceService } from '../../pieces-detachees/categorie-piece.service';
import { DepotService } from '../../pieces-detachees/depot.service';
import { CategoriePiece, Depot } from '../../../shared/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './categories.component.html'
})
export class CategoriesComponent implements OnInit {
  private categorieService = inject(CategoriePieceService);
  private depotService = inject(DepotService);
  private cdr = inject(ChangeDetectorRef);

  categories: CategoriePiece[] = [];
  depots: Depot[] = [];
  isLoading = false;

  // Pagination & Filter
  page = 1;
  pageSize = 10;
  totalElements = 0;
  totalPages = 1;
  search = '';

  newCategorie: CategoriePiece = { nom: '', depot: { id: 0 } };

  ngOnInit() {
    this.loadDepots();
    this.loadData();
  }

  loadDepots() {
    this.depotService.getAll().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.content || res?.data?.content || res?.data || []);
        this.depots = list;
        if (this.depots.length > 0 && (!this.newCategorie.depot || this.newCategorie.depot.id === 0)) {
          this.newCategorie.depot = { id: this.depots[0].id || 0 };
        }
        this.cdr.markForCheck();
      }
    });
  }

  loadData() {
    this.isLoading = true;
    this.categorieService.getAll({ page: this.page - 1, size: this.pageSize, keyword: this.search }).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          let filtered = res;
          if (this.search?.trim()) {
            const term = this.search.trim().toLowerCase();
            filtered = res.filter((c: CategoriePiece) =>
              (c.nom && c.nom.toLowerCase().includes(term)) ||
              (c.depot?.nom && c.depot.nom.toLowerCase().includes(term))
            );
          }
          this.totalElements = filtered.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
          this.categories = filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
        } else if (res?.content) {
          this.categories = res.content || [];
          this.totalElements = res.totalElements ?? this.categories.length;
          this.totalPages = res.totalPages ?? Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        } else if (res?.data?.content) {
          this.categories = res.data.content || [];
          this.totalElements = res.data.totalElements ?? this.categories.length;
          this.totalPages = res.data.totalPages ?? Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        } else if (Array.isArray(res?.data)) {
          let list = res.data;
          if (this.search?.trim()) {
            const term = this.search.trim().toLowerCase();
            list = list.filter((c: CategoriePiece) =>
              (c.nom && c.nom.toLowerCase().includes(term)) ||
              (c.depot?.nom && c.depot.nom.toLowerCase().includes(term))
            );
          }
          this.totalElements = list.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
          this.categories = list.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
        } else {
          this.categories = [];
          this.totalElements = 0;
          this.totalPages = 1;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement catégories', err);
        this.categories = [];
        this.totalElements = 0;
        this.totalPages = 1;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchChange() {
    this.page = 1;
    this.loadData();
  }

  onPageChange(newPage: number) {
    this.page = newPage;
    this.loadData();
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadData();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadData();
    }
  }

  saveCategorie() {
    if (!this.newCategorie.nom?.trim() || !this.newCategorie.depot?.id) return;
    this.categorieService.create(this.newCategorie).subscribe({
      next: () => {
        this.newCategorie = {
          nom: '',
          depot: { id: this.depots.length > 0 ? (this.depots[0].id || 0) : 0 }
        };
        this.loadData();
      },
      error: (err) => console.error('Erreur création catégorie', err)
    });
  }

  deleteCategorie(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;
    this.categorieService.delete(id).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Erreur suppression catégorie', err)
    });
  }

  getDepotName(depotId?: number): string {
    if (!depotId) return '—';
    const d = this.depots.find(item => item.id === depotId);
    return d ? d.nom : '—';
  }
}
