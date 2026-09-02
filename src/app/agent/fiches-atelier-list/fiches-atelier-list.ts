import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FicheAtelierService } from '../fiches-atelier/fiche-atelier.service';
import { FicheAtelierResponse } from '../../shared/models';
import { RouterLink } from '@angular/router';
import { LucideEye, LucideWrench } from '@lucide/angular';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-fiches-atelier-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideEye, LucideWrench, PaginationComponent],
  templateUrl: './fiches-atelier-list.html',
  styleUrl: './fiches-atelier-list.css'
})
export class FichesAtelierList extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(FicheAtelierService);
  
  fiches: FicheAtelierResponse[] = [];
  filteredFiches: FicheAtelierResponse[] = [];
  loading = false;
  error = '';
  searchVehicule = '';
  searchClient = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = '';
    const params = this.getPageParams();
    this.service.getAll(params).subscribe({
      next: (data) => {
        const arr = this.applyPageResponse<FicheAtelierResponse>(data);
        this.fiches = arr.sort((a: any, b: any) => b.id - a.id);
        this.applyFilter(); this.cdr.markForCheck();
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Erreur lors du chargement des fiches atelier.';
        this.loading = false; this.cdr.markForCheck();
      }
    });
  }

  onSearchVehicule(event: Event) {
    this.searchVehicule = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.page = 1;
    this.applyFilter(); this.cdr.markForCheck();
  }

  onSearchClient(event: Event) {
    this.searchClient = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.page = 1;
    this.applyFilter(); this.cdr.markForCheck();
  }

  applyFilter() {
    let result = this.fiches;
    if (this.searchVehicule) {
      const kw = this.searchVehicule;
      result = result.filter(f => (f.vehiculeImmatriculation || '').toLowerCase().includes(kw));
    }
    if (this.searchClient) {
      const kw = this.searchClient;
      result = result.filter(f => (f.clientName || '').toLowerCase().includes(kw));
    }
    this.filteredFiches = result;
  }
}
