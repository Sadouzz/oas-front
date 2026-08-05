import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientInterventionService } from '../services/client-intervention.service';
import { Intervention } from '../models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { StatusBadgeComponent } from '../ui/status-badge/status-badge.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';

type SortOrder = 'recent' | 'ancien';

@Component({
  selector: 'app-client-interventions',
  standalone: true,
  imports: [CommonModule, AlertComponent, StatusBadgeComponent, VehicleAvatarComponent],
  templateUrl: './client-interventions.component.html',
})
export class ClientInterventionsComponent implements OnInit {
  private service = inject(ClientInterventionService);

  interventions: Intervention[] = [];
  filtered: Intervention[] = [];
  selected: Intervention | null = null;
  loading = false;
  errorMessage = '';

  searchTerm = '';
  statutFilter = '';
  sortOrder: SortOrder = 'recent';

  get statutOptions(): string[] {
    return [...new Set(this.interventions.map(i => i.statut))];
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: interventions => { this.interventions = interventions; this.loading = false; this.applyFilter(); },
      error: () => { this.loading = false; this.errorMessage = 'Impossible de charger votre historique.'; },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.interventions
      .filter(i => !this.statutFilter || i.statut === this.statutFilter)
      .filter(i => !term || i.numero.toLowerCase().includes(term) || (i.vehicule?.immatriculation ?? '').toLowerCase().includes(term))
      .sort((a, b) => {
        const diff = new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime();
        return this.sortOrder === 'recent' ? -diff : diff;
      });
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.applyFilter();
  }

  onStatutFilter(value: string): void {
    this.statutFilter = value;
    this.applyFilter();
  }

  onSortChange(value: SortOrder): void {
    this.sortOrder = value;
    this.applyFilter();
  }

  select(intervention: Intervention): void {
    this.selected = intervention;
  }

  closeDetail(): void {
    this.selected = null;
  }

  statutLabel(statut: string): string {
    return statut ? statut.replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase()) : '—';
  }
}
