import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { TechnicienService } from '../../../../techniciens/technicien.service';
import { StepAssignationResponseDto, StatutOrdreTravail, TechnicienSummary } from '../../../models/ordre-travail.model';
import { Technicien, extractContent } from '../../../../../shared/models';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-step-assignation',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-assignation.component.html'
})
export class StepAssignationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private technicienService = inject(TechnicienService);
  private cdr = inject(ChangeDetectorRef);

  otId!: number;
  data: StepAssignationResponseDto | null = null;
  allTechniciens: Technicien[] = [];
  selectedTechnicienIds: number[] = [];

  dateDebutPrevue = '';
  tempsEstimeHeures: number | null = null;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-travail']);
      return;
    }
    this.otId = +idParam;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.technicienService.getAll({ size: 100 }).subscribe({
      next: (res) => {
        this.allTechniciens = extractContent<Technicien>(res as any);
        this.loadStep();
      },
      error: () => this.loadStep()
    });
  }

  loadStep(): void {
    this.otService.getStepAssignation(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.selectedTechnicienIds = (res.techniciens || []).map(t => t.id);
        if (res.dateDebutPrevue) {
          this.dateDebutPrevue = res.dateDebutPrevue.substring(0, 16);
        } else {
          // Date du jour par défaut format ISO locale
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          this.dateDebutPrevue = now.toISOString().slice(0, 16);
        }
        this.tempsEstimeHeures = res.tempsEstimeHeures || 2;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de l\'assignation.';
        this.cdr.markForCheck();
      }
    });
  }

  toggleTechnicien(techId: number): void {
    const index = this.selectedTechnicienIds.indexOf(techId);
    if (index >= 0) {
      this.selectedTechnicienIds.splice(index, 1);
    } else {
      this.selectedTechnicienIds.push(techId);
    }
  }

  isTechnicienSelected(techId: number): boolean {
    return this.selectedTechnicienIds.includes(techId);
  }

  validerEtDemarrerReparation(): void {
    if (this.selectedTechnicienIds.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins un technicien à affecter aux travaux.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      techniciensIds: this.selectedTechnicienIds,
      statut: StatutOrdreTravail.REPARATION,
      dateDebutPrevue: this.dateDebutPrevue ? new Date(this.dateDebutPrevue).toISOString() : undefined,
      tempsEstimeHeures: this.tempsEstimeHeures || undefined
    };

    this.otService.updateStepAssignation(this.otId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Techniciens affectés. Démarrage des réparations !';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-travail', this.otId, 'reparation']);
        }, 500);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la validation de l\'assignation.';
        this.cdr.markForCheck();
      }
    });
  }
}
