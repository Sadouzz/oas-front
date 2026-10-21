import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepReparationResponseDto, StatutOrdreTravail } from '../../../models/ordre-travail.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-step-reparation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-reparation.component.html'
})
export class StepReparationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private cdr = inject(ChangeDetectorRef);

  otId!: number;
  data: StepReparationResponseDto | null = null;

  rapportReparation = '';
  dateFinReparation = '';

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
    this.otService.getStepReparation(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.rapportReparation = res.rapportReparation || '';
        if (res.dateFinReparation) {
          this.dateFinReparation = res.dateFinReparation.substring(0, 16);
        } else {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          this.dateFinReparation = now.toISOString().slice(0, 16);
        }
        this.isReparationTerminee = res.statut === StatutOrdreTravail.TERMINE || (!!res.dateFinReparation && !!res.rapportReparation);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des réparations.';
        this.cdr.markForCheck();
      }
    });
  }

  isReparationTerminee = false;

  terminerReparation(): void {
    if (!this.rapportReparation.trim()) {
      this.errorMessage = 'Veuillez saisir un rapport technique détaillant les travaux effectués.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      rapportReparation: this.rapportReparation,
      dateFinReparation: this.dateFinReparation ? new Date(this.dateFinReparation).toISOString() : new Date().toISOString(),
      statut: StatutOrdreTravail.TERMINE
    };

    this.otService.updateStepReparation(this.otId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.isReparationTerminee = true;
        this.successMessage = 'Rapport technique validé et Ordre de Travail marqué comme TERMINE avec succès ! Vous pouvez maintenant basculer sur l\'Ordre de Réparation pour le paiement et la livraison.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la validation du rapport.';
        this.cdr.markForCheck();
      }
    });
  }
}
