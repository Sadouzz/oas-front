import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientFactureService } from '../services/client-facture.service';
import { FactureModel } from '../../shared/models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { StatusBadgeComponent, BadgeTone } from '../ui/status-badge/status-badge.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';

type SortOrder = 'recent' | 'ancien';

const STATUT_LABELS: Record<FactureModel['statutPaiement'], string> = {
  NON_PAYE: 'Non payée',
  PARTIEL: 'Partiellement payée',
  PAYE: 'Payée',
};

const STATUT_TONES: Record<FactureModel['statutPaiement'], BadgeTone> = {
  NON_PAYE: 'danger',
  PARTIEL: 'pending',
  PAYE: 'success',
};

@Component({
  selector: 'app-client-factures',
  standalone: true,
  imports: [CommonModule, AlertComponent, StatusBadgeComponent, VehicleAvatarComponent],
  templateUrl: './client-factures.component.html',
})
export class ClientFacturesComponent implements OnInit {
  private service = inject(ClientFactureService);

  factures: FactureModel[] = [];
  filtered: FactureModel[] = [];
  selected: FactureModel | null = null;
  loading = false;
  errorMessage = '';

  searchTerm = '';
  statutFilter = '';
  sortOrder: SortOrder = 'recent';

  readonly statutLabels = STATUT_LABELS;
  readonly statutTones = STATUT_TONES;
  readonly statutOptions = Object.keys(STATUT_LABELS) as FactureModel['statutPaiement'][];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: factures => { this.factures = factures; this.loading = false; this.applyFilter(); },
      error: () => { this.loading = false; this.errorMessage = 'Impossible de charger vos factures.'; },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.factures
      .filter(f => !this.statutFilter || f.statutPaiement === this.statutFilter)
      .filter(f => !term || f.numero?.toLowerCase().includes(term) || (f.immatriculation ?? '').toLowerCase().includes(term))
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

  select(facture: FactureModel): void {
    this.selected = facture;
  }

  closeDetail(): void {
    this.selected = null;
  }
}
