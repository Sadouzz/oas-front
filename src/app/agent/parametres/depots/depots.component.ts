import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepotService } from '../../pieces-detachees/depot.service';
import { Depot } from '../../../shared/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-depots',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './depots.component.html'
})
export class DepotsComponent implements OnInit {
  private depotService = inject(DepotService);
  private cdr = inject(ChangeDetectorRef);

  depots: Depot[] = [];
  allDepots: Depot[] = [];
  isLoading = false;

  // Pagination & Filter
  page = 1;
  pageSize = 10;
  totalElements = 0;
  totalPages = 1;
  search = '';

  newDepot: Depot = { nom: '', description: '' };

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.depotService.getAll({ page: this.page - 1, size: this.pageSize, keyword: this.search }).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          // Backend returned an unpaged list
          let filtered = res;
          if (this.search?.trim()) {
            const term = this.search.trim().toLowerCase();
            filtered = res.filter((d: Depot) =>
              (d.nom && d.nom.toLowerCase().includes(term)) ||
              (d.description && d.description.toLowerCase().includes(term))
            );
          }
          this.totalElements = filtered.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
          this.depots = filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
        } else if (res?.content) {
          // Spring Data Page<Depot>
          this.depots = res.content || [];
          this.totalElements = res.totalElements ?? this.depots.length;
          this.totalPages = res.totalPages ?? Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        } else if (res?.data?.content) {
          // ApiResponse<Page<Depot>>
          this.depots = res.data.content || [];
          this.totalElements = res.data.totalElements ?? this.depots.length;
          this.totalPages = res.data.totalPages ?? Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        } else if (Array.isArray(res?.data)) {
          // ApiResponse<List<Depot>>
          let list = res.data;
          if (this.search?.trim()) {
            const term = this.search.trim().toLowerCase();
            list = list.filter((d: Depot) =>
              (d.nom && d.nom.toLowerCase().includes(term)) ||
              (d.description && d.description.toLowerCase().includes(term))
            );
          }
          this.totalElements = list.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
          this.depots = list.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
        } else {
          this.depots = [];
          this.totalElements = 0;
          this.totalPages = 1;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement dépôts', err);
        this.depots = [];
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

  saveDepot() {
    if (!this.newDepot.nom?.trim()) return;
    this.depotService.create(this.newDepot).subscribe({
      next: () => {
        this.newDepot = { nom: '', description: '' };
        this.loadData();
      },
      error: (err) => console.error('Erreur création dépôt', err)
    });
  }

  deleteDepot(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dépôt ?')) return;
    this.depotService.delete(id).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Erreur suppression dépôt', err)
    });
  }
}
