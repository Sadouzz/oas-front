import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientProformaService, Proforma } from './client-proforma.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { StatusBadgeComponent, BadgeTone } from '../ui/status-badge/status-badge.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';

type SortOrder = 'recent' | 'ancien';

const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  ACCEPTE: 'Accepté',
  REJETE: 'Refusé',
};

const STATUT_TONES: Record<string, BadgeTone> = {
  EN_ATTENTE: 'pending',
  ACCEPTE: 'success',
  REJETE: 'danger',
};

@Component({
  selector: 'app-client-proformas',
  standalone: true,
  imports: [CommonModule, AlertComponent, StatusBadgeComponent, VehicleAvatarComponent],
  templateUrl: './client-proformas.component.html',
})
export class ClientProformasComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(ClientProformaService);

  proformas: Proforma[] = [];
  filtered: Proforma[] = [];
  selected: Proforma | null = null;
  loading = false;
  acting = false;
  successMessage = '';
  errorMessage = '';

  searchTerm = '';
  statutFilter = '';
  sortOrder: SortOrder = 'recent';

  readonly statutOptions = Object.keys(STATUT_LABELS);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: proformas => { this.proformas = proformas; this.loading = false; this.cdr.markForCheck(); this.applyFilter(); this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); this.errorMessage = 'Impossible de charger vos proformas.'; },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.proformas
      .filter(p => !this.statutFilter || (p.statut ?? 'EN_ATTENTE') === this.statutFilter)
      .filter(p => !term || p.numero?.toLowerCase().includes(term) || (p.immatriculation ?? '').toLowerCase().includes(term))
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

  select(proforma: Proforma): void {
    this.selected = proforma;
  }

  closeDetail(): void {
    this.selected = null;
  }

  isPending(proforma: Proforma): boolean {
    return proforma.statut === 'EN_ATTENTE' || !proforma.statut;
  }

  statutLabel(proforma: Proforma): string {
    return STATUT_LABELS[proforma.statut ?? 'EN_ATTENTE'] ?? proforma.statut ?? 'En attente';
  }

  statutTone(proforma: Proforma): BadgeTone {
    return STATUT_TONES[proforma.statut ?? 'EN_ATTENTE'] ?? 'neutral';
  }

  valider(id: number): void {
    this.acting = true;
    this.service.valider(id).subscribe({
      next: () => {
        this.acting = false;
        if (this.selected && this.selected.id === id) this.selected.statut = 'ACCEPTE';
        this.successMessage = 'Proforma validée.';
        setTimeout(() => this.successMessage = '', 4000);
        this.load();
      },
      error: (err: any) => {
        this.acting = false;
        this.errorMessage = err.error?.message || 'Impossible de valider cette proforma.';
      },
    });
  }

  refuser(id: number): void {
    if (!confirm('Confirmer le refus de cette proforma ?')) return;
    this.acting = true;
    this.service.refuser(id).subscribe({
      next: () => {
        this.acting = false;
        if (this.selected && this.selected.id === id) this.selected.statut = 'REJETE';
        this.successMessage = 'Proforma refusée.';
        setTimeout(() => this.successMessage = '', 4000);
        this.load();
      },
      error: (err: any) => {
        this.acting = false;
        this.errorMessage = err.error?.message || 'Impossible de refuser cette proforma.';
      },
    });
  }
}
