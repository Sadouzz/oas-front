import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FicheAtelierService } from '../fiches-atelier/fiche-atelier.service';
import { FicheAtelierResponse } from '../../shared/models';
import { RouterLink } from '@angular/router';
import { LucideEye, LucideWrench } from '@lucide/angular';

@Component({
  selector: 'app-fiches-atelier-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideEye, LucideWrench],
  templateUrl: './fiches-atelier-list.html',
  styleUrl: './fiches-atelier-list.css'
})
export class FichesAtelierList implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(FicheAtelierService);
  
  fiches: FicheAtelierResponse[] = [];
  filteredFiches: FicheAtelierResponse[] = [];
  loading = false;
  error = '';
  searchVehicule = '';
  searchClient = '';

  ngOnInit(): void {
    this.loadFiches();
  }

  loadFiches() {
    this.loading = true;
    this.error = '';
    this.service.getAll().subscribe({
      next: (data) => {
        this.fiches = data.sort((a, b) => b.id - a.id);
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
    this.searchVehicule = (event.target as HTMLInputElement).value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  onSearchClient(event: Event) {
    this.searchClient = (event.target as HTMLInputElement).value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  applyFilter() {
    let result = this.fiches;
    if (this.searchVehicule) {
      const kw = this.searchVehicule.toLowerCase();
      result = result.filter(f => (f.vehiculeImmatriculation || '').toLowerCase().includes(kw));
    }
    if (this.searchClient) {
      const kw = this.searchClient.toLowerCase();
      result = result.filter(f => (f.clientName || '').toLowerCase().includes(kw));
    }
    this.filteredFiches = result;
  }
}
