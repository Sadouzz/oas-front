import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FicheAtelierService } from '../fiche-atelier.service';
import { RendezVousService } from '../../rendezvous/rendezvous.service';
import { FicheAtelierDetailsResponse, RendezVous, extractContent } from '../../../shared/models';
import { Router, RouterLink } from '@angular/router';
import { LucideEye, LucideWrench, LucidePlus, LucideX, LucideCalendar } from '@lucide/angular';
import { BasePaginatedComponent } from '../../../shared/components/base-paginated.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-fiches-atelier-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideEye, LucideWrench, LucidePlus, LucideX, LucideCalendar, PaginationComponent],
  templateUrl: './fiches-atelier-list.html'
})
export class FichesAtelierList extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(FicheAtelierService);
  private rdvService = inject(RendezVousService);
  private router = inject(Router);
  
  fiches: FicheAtelierDetailsResponse[] = [];
  loading = false;
  error = '';
  private searchTimeout: any;

  // Modal Nouveau Fiche Atelier (Sélection RDV)
  showNewModal = false;
  loadingRdv = false;
  rendezVousList: RendezVous[] = [];
  rdvSearch = '';

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

  openNewFicheModal() {
    this.showNewModal = true;
    this.rdvSearch = '';
    this.loadRendezVous();
  }

  closeNewFicheModal() {
    this.showNewModal = false;
  }

  loadRendezVous() {
    this.loadingRdv = true;
    this.cdr.markForCheck();
    this.rdvService.getAll({ size: 100 }).subscribe({
      next: (data) => {
        this.rendezVousList = extractContent<RendezVous>(data).filter(r => 
          r.statut !== 'ANNULE' && r.statut !== 'REFUSE' && !r.hasFicheAtelier
        );
        this.loadingRdv = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.rendezVousList = [];
        this.loadingRdv = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredRendezVous(): RendezVous[] {
    if (!this.rdvSearch?.trim()) return this.rendezVousList;
    const term = this.rdvSearch.toLowerCase().trim();
    return this.rendezVousList.filter(r =>
      (r.clientName && r.clientName.toLowerCase().includes(term)) ||
      (r.vehiculeImmatriculation && r.vehiculeImmatriculation.toLowerCase().includes(term)) ||
      (r.motif && r.motif.toLowerCase().includes(term)) ||
      (r.dateRendezVous && r.dateRendezVous.toLowerCase().includes(term))
    );
  }

  selectRendezVous(rdv: RendezVous) {
    this.showNewModal = false;
    this.router.navigate(['/app/admin/fiches-atelier/new', rdv.id]);
  }

  createWithoutRdv() {
    this.showNewModal = false;
    this.router.navigate(['/app/admin/fiches-atelier/new']);
  }
}
