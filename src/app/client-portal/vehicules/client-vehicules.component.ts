import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientVehiculeService } from '../services/client-vehicule.service';
import { ClientInterventionService } from '../services/client-intervention.service';
import { ClientFactureService } from '../services/client-facture.service';
import { VehiculeModel, FactureModel } from '../../shared/models';
import { Intervention } from '../models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { VehicleAvatarComponent } from '../ui/vehicle-avatar/vehicle-avatar.component';
import { StatusBadgeComponent } from '../ui/status-badge/status-badge.component';
import { ProgressStepperComponent } from '../ui/progress-stepper/progress-stepper.component';
import { interventionStage, interventionStageIndex, isActiveRepair, stageExplanation, AUCUN_HISTORIQUE, STAGE_ORDER } from '../intervention-stage';
import { vehiclePhotoFor } from '../vehicle-photos';

type SortOrder = 'recent' | 'ancien';

@Component({
  selector: 'app-client-vehicules',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent, VehicleAvatarComponent, StatusBadgeComponent, ProgressStepperComponent],
  templateUrl: './client-vehicules.component.html',
})
export class ClientVehiculesComponent implements OnInit {
  private service = inject(ClientVehiculeService);
  private interventionService = inject(ClientInterventionService);
  private factureService = inject(ClientFactureService);
  private fb = inject(FormBuilder);

  vehicules: VehiculeModel[] = [];
  filtered: VehiculeModel[] = [];
  interventions: Intervention[] = [];
  factures: FactureModel[] = [];
  selected: VehiculeModel | null = null;
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
    let remaining = 3;
    const done = () => { remaining -= 1; if (remaining === 0) { this.loading = false; this.applyFilter(); } };

    this.service.getAll().subscribe({
      next: vehicules => { this.vehicules = vehicules; done(); },
      error: () => { this.errorMessage = 'Impossible de charger vos véhicules.'; done(); },
    });

    this.interventionService.getAll().subscribe({
      next: interventions => { this.interventions = interventions; done(); },
      error: () => done(),
    });

    this.factureService.getAll().subscribe({
      next: factures => { this.factures = factures; done(); },
      error: () => done(),
    });
  }

  private interventionsFor(vehiculeId: number): Intervention[] {
    return this.interventions
      .filter(i => i.vehicule?.id === vehiculeId)
      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime());
  }

  vehiculeStage(vehicule: VehiculeModel) {
    const derniere = this.interventionsFor(vehicule.id)[0];
    return derniere ? interventionStage(derniere.statut) : AUCUN_HISTORIQUE;
  }

  vehiculeStageIndex(vehicule: VehiculeModel): number {
    const derniere = this.interventionsFor(vehicule.id)[0];
    return derniere ? interventionStageIndex(derniere.statut) : -1;
  }

  historiqueFor(vehicule: VehiculeModel): Intervention[] {
    return this.interventionsFor(vehicule.id);
  }

  /**
   * Fiche de réparation à afficher comme "en cours". Reste affichée après la fin de la
   * réparation (statut "Terminée") tant qu'on n'est pas au lendemain de la date de sortie
   * ET qu'au moins un paiement partiel a été effectué sur la facture liée. Sans paiement,
   * elle ne disparaît jamais via cette règle (le véhicule n'a probablement pas encore été repris).
   */
  ficheEnCoursFor(vehicule: VehiculeModel): Intervention | null {
    const derniere = this.interventionsFor(vehicule.id)[0];
    if (!derniere) return null;
    if (isActiveRepair(derniere.statut)) return derniere;
    if (interventionStage(derniere.statut).label !== 'Terminée') return null;

    if (!derniere.dateSortie) return derniere;

    const facture = this.factures.find(f => f.ordreReparationId === derniere.id);
    const aPaiementPartiel = !!facture && facture.montantPaye > 0;
    if (!aPaiementPartiel) return derniere;

    const lendemainSortie = new Date(derniere.dateSortie);
    lendemainSortie.setDate(lendemainSortie.getDate() + 1);
    lendemainSortie.setHours(0, 0, 0, 0);
    return new Date() < lendemainSortie ? derniere : null;
  }

  stageOf(statut: string) {
    return interventionStage(statut);
  }

  photoFor(vehicule: VehiculeModel): string {
    return vehiclePhotoFor(vehicule.id);
  }

  explanationFor(vehicule: VehiculeModel, stageLabel: string): string {
    return stageExplanation(stageLabel, vehicule.marque, vehicule.modele);
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
  }

  onStageFilter(value: string): void {
    this.stageFilter = value;
    this.applyFilter();
  }

  onSortChange(value: SortOrder): void {
    this.sortOrder = value;
    this.applyFilter();
  }

  select(vehicule: VehiculeModel): void {
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

    this.service.create(this.form.value).subscribe({
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
}
