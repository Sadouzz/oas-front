import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientRendezVousService } from './client-rendezvous.service';
import { ClientVehiculeService } from '../vehicules/client-vehicule.service';
import { ClientInterventionService } from '../interventions/client-intervention.service';
import { GarageService } from '../../services/garage.service';
import { RendezVous, RendezVousStatus, VehiculeModel, Garage } from '../../shared/models';
import { Intervention } from '../models';
import { isActiveRepair } from '../intervention-stage';
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
  private cdr = inject(ChangeDetectorRef);
  private service = inject(ClientRendezVousService);
  private vehiculeService = inject(ClientVehiculeService);
  private interventionService = inject(ClientInterventionService);
  private garageService = inject(GarageService);
  private fb = inject(FormBuilder);

  rendezvous: RendezVous[] = [];
  filtered: RendezVous[] = [];
  selected: RendezVous | null = null;
  vehicules: VehiculeModel[] = [];
  interventions: Intervention[] = [];
  garages: Garage[] = [];
  loading = false;
  showCreateModal = false;
  saving = false;
  successMessage = '';
  errorMessage = '';
  modalErrorMessage = '';

  vehiculeSearchTerm = '';
  vehiculeDropdownOpen = false;
  showVehiculeCreateForm = false;
  vehiculeSaving = false;
  vehiculeCreateError = '';

  searchTerm = '';
  statutFilter = '';
  sortOrder: SortOrder = 'recent';

  form: FormGroup = this.fb.group({
    dateRendezVous: ['', Validators.required],
    motif: ['', Validators.required],
    vehiculeId: [null, Validators.required],
    garageId: [null, Validators.required]
  });

  vehiculeForm: FormGroup = this.fb.group({
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    annee: [null],
    kilometrage: [null],
    numeroChassis: [''],
  });

  readonly statutLabels = STATUT_LABELS;
  readonly statutTones = STATUT_TONES;
  readonly statutOptions = Object.keys(STATUT_LABELS) as RendezVousStatus[];

  ngOnInit(): void {
    this.load();
    this.vehiculeService.getAll().subscribe({ next: v => this.vehicules = v });
    this.interventionService.getAll().subscribe({ next: i => this.interventions = i });
    this.garageService.getAll().subscribe({ next: g => this.garages = g });
  }

  /** Le véhicule a-t-il une réparation en cours (statut actif, hors "Terminée") ? */
  vehiculeEnReparation(vehiculeId: number): boolean {
    const derniere = this.interventions
      .filter(i => i.vehicule?.id === vehiculeId)
      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())[0];
    return !!derniere && isActiveRepair(derniere.statut);
  }

  get vehiculesDisponibles(): VehiculeModel[] {
    return this.vehicules.filter(v => !this.vehiculeEnReparation(v.id));
  }

  get vehiculesFiltres(): VehiculeModel[] {
    const term = this.vehiculeSearchTerm.trim().toLowerCase();
    return this.vehiculesDisponibles.filter(v => !term
      || v.immatriculation.toLowerCase().includes(term)
      || v.marque.toLowerCase().includes(term)
      || v.modele.toLowerCase().includes(term));
  }

  selectedVehiculeLabel(): string {
    const id = this.form.get('vehiculeId')?.value;
    const v = this.vehicules.find(x => x.id === id);
    return v ? `${v.immatriculation} — ${v.marque} ${v.modele}` : '';
  }

  onVehiculeSearch(value: string): void {
    this.vehiculeSearchTerm = value;
    this.vehiculeDropdownOpen = true;
  }

  openVehiculeDropdown(): void {
    this.vehiculeSearchTerm = '';
    this.vehiculeDropdownOpen = true;
  }

  selectVehicule(id: number | null): void {
    this.form.get('vehiculeId')?.setValue(id);
    this.vehiculeSearchTerm = '';
    this.vehiculeDropdownOpen = false;
  }

  closeVehiculeDropdownDelayed(): void {
    setTimeout(() => this.vehiculeDropdownOpen = false, 150);
  }

  openVehiculeCreateForm(): void {
    this.vehiculeForm.reset();
    this.vehiculeCreateError = '';
    this.showVehiculeCreateForm = true;
    this.vehiculeDropdownOpen = false;
  }

  closeVehiculeCreateForm(): void {
    this.showVehiculeCreateForm = false;
    this.vehiculeCreateError = '';
  }

  saveVehicule(): void {
    if (this.vehiculeForm.invalid) {
      this.vehiculeForm.markAllAsTouched();
      return;
    }

    this.vehiculeSaving = true;
    this.vehiculeCreateError = '';

    this.vehiculeService.create(this.vehiculeForm.value).subscribe({
      next: (vehicule) => {
        this.vehiculeSaving = false;
        this.vehicules = [...this.vehicules, vehicule];
        this.selectVehicule(vehicule.id);
        this.showVehiculeCreateForm = false;
      },
      error: (err: any) => {
        this.vehiculeSaving = false;
        this.vehiculeCreateError = err.error?.message || "Impossible d'ajouter ce véhicule.";
      },
    });
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: rdv => { this.rendezvous = rdv; this.loading = false; this.cdr.markForCheck(); this.applyFilter(); this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); this.errorMessage = 'Impossible de charger vos rendez-vous.'; },
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

  select(rdv: RendezVous): void {
    this.selected = rdv;
  }

  closeDetail(): void {
    this.selected = null;
  }

  openCreate(): void {
    this.form.reset();
    this.vehiculeSearchTerm = '';
    this.vehiculeDropdownOpen = false;
    this.showVehiculeCreateForm = false;
    this.modalErrorMessage = '';
    this.showCreateModal = true;
  }

  closeCreate(): void {
    this.showCreateModal = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.modalErrorMessage = "Veuillez remplir tous les champs obligatoires.";
      return;
    }

    this.saving = true;
    this.modalErrorMessage = '';

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
        const msg = typeof err.error === 'string' ? err.error : err.error?.message;
        this.modalErrorMessage = msg || "Une erreur est survenue lors de l'envoi de la demande.";
      },
    });
  }

  canCancel(statut: RendezVousStatus): boolean {
    // Un RDV confirmé est immédiatement transformé en ordre de réparation côté back
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
