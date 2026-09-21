import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientPortalService } from '../layout/client-portal.service';
import { ClientVehiculeService } from './client-vehicule.service';
import { ClientVehiculeCard, ClientInterventionSummary, FicheEnCoursSummary } from '../models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';
import { StatusBadgeComponent, BadgeTone } from '../ui/status-badge/status-badge.component';
import { ProgressStepperComponent } from '../ui/progress-stepper/progress-stepper.component';
import { stageExplanation, STAGE_ORDER, interventionStage } from '../intervention-stage';
import { vehiclePhotoFor } from '../vehicle-photos';

import { ModalComponent } from '../ui/modal/modal.component';

type SortOrder = 'recent' | 'ancien';

@Component({
  selector: 'app-client-vehicules',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent, VehicleAvatarComponent, StatusBadgeComponent, ProgressStepperComponent, ModalComponent],
  templateUrl: './client-vehicules.component.html',
})
export class ClientVehiculesComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private portalService = inject(ClientPortalService);
  private vehiculeService = inject(ClientVehiculeService);
  private fb = inject(FormBuilder);

  vehicules: ClientVehiculeCard[] = [];
  filtered: ClientVehiculeCard[] = [];
  selected: ClientVehiculeCard | null = null;
  loading = false;
  showCreateForm = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  searchTerm = '';
  stageFilter = '';
  sortOrder: SortOrder = 'recent';
  readonly stageOrder = STAGE_ORDER;

  form: FormGroup = this.fb.group({
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    annee: [null],
    kilometrage: [null],
    numeroChassis: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.portalService.getVehicules().subscribe({
      next: vehicules => {
        this.vehicules = vehicules;
        this.loading = false;
        this.cdr.markForCheck();
        this.applyFilter();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.errorMessage = 'Impossible de charger vos véhicules.';
      },
    });
  }

  vehiculeStage(vehicule: ClientVehiculeCard): { label: string; tone: BadgeTone } {
    return {
      label: vehicule.stageLabel || 'Aucun historique',
      tone: (vehicule.stageTone as BadgeTone) || 'neutral'
    };
  }

  vehiculeStageIndex(vehicule: ClientVehiculeCard): number {
    return vehicule.stageIndex ?? -1;
  }

  historiqueFor(vehicule: ClientVehiculeCard): ClientInterventionSummary[] {
    return vehicule.historique ?? [];
  }

  ficheEnCoursFor(vehicule: ClientVehiculeCard): FicheEnCoursSummary | null {
    return vehicule.ficheEnCours;
  }

  formatLignesReception(lignes: { nom: string; etat: boolean | null }[] | null | undefined): string {
    if (!lignes || !lignes.length) return '—';
    return lignes.map(l => l.nom + (l.etat === true ? ' (OK)' : l.etat === false ? ' (Non)' : '')).join(', ');
  }

  photoFor(vehicule: ClientVehiculeCard): string {
    return vehiclePhotoFor(vehicule.id);
  }

  explanationFor(vehicule: ClientVehiculeCard, stageLabel: string): string {
    return stageExplanation(stageLabel, vehicule.marque, vehicule.modele);
  }

  stageOf(statut: string): { label: string; tone: BadgeTone } {
    return interventionStage(statut);
  }

  applyFilter(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.vehicules
      .filter(v => !this.stageFilter || this.vehiculeStage(v).label === this.stageFilter)
      .filter(v => !term || v.immatriculation.toLowerCase().includes(term) || v.marque.toLowerCase().includes(term) || v.modele.toLowerCase().includes(term))
      .sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return this.sortOrder === 'recent' ? -diff : diff;
      });
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  onStageFilter(value: string): void {
    this.stageFilter = value;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  onSortChange(value: SortOrder): void {
    this.sortOrder = value;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  select(vehicule: ClientVehiculeCard): void {
    this.selected = vehicule;
  }

  closeDetail(): void {
    this.selected = null;
  }

  toggleCreate(): void {
    this.showCreateForm = !this.showCreateForm;
  }

  closeCreate(): void {
    this.form.reset();
    this.showCreateForm = false;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    this.vehiculeService.create(this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.form.reset();
        this.showCreateForm = false;
        this.successMessage = 'Véhicule enregistré avec succès.';
        setTimeout(() => this.successMessage = '', 4000);
        this.load();
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || "Une erreur est survenue lors de l'enregistrement.";
      },
    });
  }

  archive(vehicule: ClientVehiculeCard): void {
    if (confirm('Voulez-vous vraiment archiver ce véhicule ?')) {
      this.vehiculeService.archive(vehicule.id).subscribe({
        next: () => {
          this.successMessage = 'Véhicule archivé avec succès.';
          setTimeout(() => this.successMessage = '', 4000);
          if (this.selected?.id === vehicule.id) this.selected = null;
          this.load();
        },
        error: (err: any) => {
          this.errorMessage = err.error?.message || "Impossible d'archiver le véhicule.";
        }
      });
    }
  }
}
