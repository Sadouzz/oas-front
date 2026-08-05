import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientRendezVousService } from '../services/client-rendezvous.service';
import { ClientVehiculeService } from '../services/client-vehicule.service';
import { RendezVous, RendezVousStatus, VehiculeModel } from '../../shared/models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { StatusBadgeComponent, BadgeTone } from '../ui/status-badge/status-badge.component';
import { ModalComponent } from '../ui/modal/modal.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';

type SortOrder = 'recent' | 'ancien';

const STATUT_LABELS: Record<RendezVousStatus, string> = {
  EN_ATTENTE: 'En attente',
  CONFIRME: 'Confirmé',
  REFUSE: 'Refusé',
  ANNULE: 'Annulé',
  TERMINE: 'Terminé',
};

const STATUT_TONES: Record<RendezVousStatus, BadgeTone> = {
  EN_ATTENTE: 'pending',
  CONFIRME: 'success',
  REFUSE: 'danger',
  ANNULE: 'neutral',
  TERMINE: 'info',
};

@Component({
  selector: 'app-client-rendezvous',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent, StatusBadgeComponent, ModalComponent, VehicleAvatarComponent],
  templateUrl: './client-rendezvous.component.html',
})
export class ClientRendezVousComponent implements OnInit {
  private service = inject(ClientRendezVousService);
  private vehiculeService = inject(ClientVehiculeService);
  private fb = inject(FormBuilder);

  rendezvous: RendezVous[] = [];
  filtered: RendezVous[] = [];
  selected: RendezVous | null = null;
  vehicules: VehiculeModel[] = [];
  loading = false;
  showCreateModal = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  searchTerm = '';
  statutFilter = '';
  sortOrder: SortOrder = 'recent';

  form: FormGroup = this.fb.group({
    dateRendezVous: ['', Validators.required],
    motif: ['', Validators.required],
    vehiculeId: [null],
  });

  readonly statutLabels = STATUT_LABELS;
  readonly statutTones = STATUT_TONES;
  readonly statutOptions = Object.keys(STATUT_LABELS) as RendezVousStatus[];

  ngOnInit(): void {
    this.load();
    this.vehiculeService.getAll().subscribe({ next: v => this.vehicules = v });
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: rdv => { this.rendezvous = rdv; this.loading = false; this.applyFilter(); },
      error: () => { this.loading = false; this.errorMessage = 'Impossible de charger vos rendez-vous.'; },
    });
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.rendezvous
      .filter(r => !this.statutFilter || r.statut === this.statutFilter)
      .filter(r => !term || r.motif?.toLowerCase().includes(term) || (r.vehiculeImmatriculation ?? '').toLowerCase().includes(term))
      .sort((a, b) => {
        const diff = new Date(a.dateRendezVous).getTime() - new Date(b.dateRendezVous).getTime();
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

  select(rdv: RendezVous): void {
    this.selected = rdv;
  }

  closeDetail(): void {
    this.selected = null;
  }

  openCreate(): void {
    this.form.reset();
    this.showCreateModal = true;
  }

  closeCreate(): void {
    this.showCreateModal = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.service.create(this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.showCreateModal = false;
        this.successMessage = 'Demande de rendez-vous envoyée.';
        setTimeout(() => this.successMessage = '', 4000);
        this.load();
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || "Une erreur est survenue lors de l'envoi de la demande.";
      },
    });
  }

  canCancel(statut: RendezVousStatus): boolean {
    // Un RDV confirmé est immédiatement transformé en fiche atelier côté back
    // (même transaction) : au-delà de EN_ATTENTE, il n'est plus annulable.
    return statut === 'EN_ATTENTE';
  }

  annuler(id: number): void {
    if (!confirm('Confirmer l’annulation de ce rendez-vous ?')) return;
    this.service.annuler(id).subscribe({
      next: () => {
        this.successMessage = 'Rendez-vous annulé.';
        setTimeout(() => this.successMessage = '', 4000);
        this.load();
      },
      error: (err: any) => this.errorMessage = err.error?.message || "Impossible d'annuler ce rendez-vous.",
    });
  }
}
