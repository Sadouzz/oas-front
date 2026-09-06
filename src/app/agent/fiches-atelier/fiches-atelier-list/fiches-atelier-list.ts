import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FicheAtelierService } from '../fiche-atelier.service';
import { FicheAtelierDetailsResponse } from '../../../shared/models';
import { RouterLink } from '@angular/router';
import { LucideEye, LucideWrench } from '@lucide/angular';
import { BasePaginatedComponent } from '../../../shared/components/base-paginated.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-fiches-atelier-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideEye, LucideWrench, PaginationComponent],
  templateUrl: './fiches-atelier-list.html'
})
export class FichesAtelierList extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(FicheAtelierService);
  
  fiches: FicheAtelierDetailsResponse[] = [];
  loading = false;
  error = '';
  private searchTimeout: any;

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    const params = this.getPageParams();
    this.service.getAll(params).subscribe({
      next: (data) => {
        const arr = this.applyPageResponse<FicheAtelierDetailsResponse>(data);
        this.fiches = arr.sort((a: any, b: any) => b.id - a.id);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Erreur lors du chargement des fiches atelier.';
        this.fiches = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchInput(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.loadData();
    }, 300);
  }
}
