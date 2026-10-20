import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepPretALivrerResponseDto, StatutOrdreTravail } from '../../../models/ordre-travail.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-step-pret-a-livrer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-pret-a-livrer.component.html'
})
export class StepPretALivrerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private cdr = inject(ChangeDetectorRef);

  otId!: number;
  data: StepPretALivrerResponseDto | null = null;
  remarquesPreparation = '';

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
    this.otService.getStepPretALivrer(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.remarquesPreparation = res.remarquesPreparation || '';
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de la préparation.';
        this.cdr.markForCheck();
      }
    });
  }

  validerPreparation(): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      remarquesPreparation: this.remarquesPreparation,
      statut: StatutOrdreTravail.LIVRE
    };

    this.otService.updateStepPretALivrer(this.otId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Véhicule marqué comme prêt pour la livraison.';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-travail', this.otId, 'livraison']);
        }, 500);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la validation.';
        this.cdr.markForCheck();
      }
    });
  }
}
