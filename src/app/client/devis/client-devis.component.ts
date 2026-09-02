import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientDevisService } from './client-devis.service';
import { DevisPrevisionnel, StatutDevis } from '../models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { StatusBadgeComponent, BadgeTone } from '../ui/status-badge/status-badge.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';

type SortOrder = 'recent' | 'ancien';

const STATUT_LABELS: Record<StatutDevis, string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTE: 'Accepté',
  REJETE: 'Refusé',
  PAYEE: 'Payé',
  PARTIELLEMENT_PAYEE: 'Partiellement payé',
  ANNULEE: 'Annulé',
};

const STATUT_TONES: Record<StatutDevis, BadgeTone> = {
  EN_ATTENTE: 'pending',
  ACCEPTE: 'success',
  REJETE: 'danger',
  PAYEE: 'success',
  PARTIELLEMENT_PAYEE: 'info',
  ANNULEE: 'neutral',
};

@Component({
  selector: 'app-client-devis',
  standalone: true,
  imports: [CommonModule, AlertComponent, StatusBadgeComponent, VehicleAvatarComponent],
  templateUrl: './client-devis.component.html',
})
export class ClientDevisComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(ClientDevisService);

  devis: DevisPrevisionnel[] = [];
  filtered: DevisPrevisionnel[] = [];
  selected: DevisPrevisionnel | null = null;
  loading = false;
  acting = false;
  successMessage = '';
  errorMessage = '';

  searchTerm = '';
  statutFilter = '';
  sortOrder: SortOrder = 'recent';

  readonly statutLabels = STATUT_LABELS;
  readonly statutTones = STATUT_TONES;
  readonly statutOptions = Object.keys(STATUT_LABELS) as StatutDevis[];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: devis => { this.devis = devis; this.loading = false; this.cdr.markForCheck(); this.applyFilter(); this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); this.errorMessage = 'Impossible de charger vos devis.'; },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.devis
      .filter(d => !this.statutFilter || d.statut === this.statutFilter)
      .filter(d => !term || (d.vehicule?.immatriculation ?? '').toLowerCase().includes(term))
      .sort((a, b) => {
        const diff = new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime();
        return this.sortOrder === 'recent' ? -diff : diff;
      });
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  onStatutFilter(value: string): void {
    this.statutFilter = value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  onSortChange(value: SortOrder): void {
    this.sortOrder = value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  select(devis: DevisPrevisionnel): void {
    this.selected = devis;
  }

  closeDetail(): void {
    this.selected = null;
  }

  isPending(devis: DevisPrevisionnel): boolean {
    return devis.statut === 'EN_ATTENTE';
  }

  accepter(id: number): void {
    this.acting = true;
    this.service.accepter(id).subscribe({
      next: updated => {
        this.acting = false;
        if (this.selected && this.selected.id === id) this.selected = updated;
        this.successMessage = 'Devis accepté.';
        setTimeout(() => this.successMessage = '', 4000);
        this.load();
      },
      error: (err: any) => {
        this.acting = false;
        this.errorMessage = err.error?.message || 'Impossible d’accepter ce devis.';
      },
    });
  }

  refuser(id: number): void {
    if (!confirm('Confirmer le refus de ce devis ?')) return;
    this.acting = true;
    this.service.refuser(id).subscribe({
      next: updated => {
        this.acting = false;
        if (this.selected && this.selected.id === id) this.selected = updated;
        this.successMessage = 'Devis refusé.';
        setTimeout(() => this.successMessage = '', 4000);
        this.load();
      },
      error: (err: any) => {
        this.acting = false;
        this.errorMessage = err.error?.message || 'Impossible de refuser ce devis.';
      },
    });
  }
}
