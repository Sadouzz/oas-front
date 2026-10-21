import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { StepPretALivrerResponseDto } from '../../../models/responses/step-pret-a-livrer-response.dto';
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
  private ordreService = inject(OrdreReparationService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  data: StepPretALivrerResponseDto | null = null;
  remarquesPreparation = '';

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-reparation']);
      return;
    }
    this.ordreId = +idParam;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.ordreService.getStepPretALivrer(this.ordreId).subscribe({
      next: (res) => {
        this.data = res;
        this.remarquesPreparation = res.remarquesPreparation || '';
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des informations de préparation.';
        this.cdr.markForCheck();
      }
    });
  }

  validateStep(): void {
    this.validerPreparation();
  }

  validerPreparation(): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      remarquesPreparation: this.remarquesPreparation,
      statut: 'LIVRE' as any
    };

    this.ordreService.updateStepPretALivrer(this.ordreId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Véhicule marqué comme prêt pour la livraison.';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'livraison']);
        }, 500);
      },
      error: () => {
        this.ordreService.updateStatut(this.ordreId, 'PRET_A_LIVRER').subscribe({
          next: () => {
            this.saving = false;
            this.router.navigate(['/app/ordres-reparation', this.ordreId, 'livraison']);
          },
          error: (err) => {
            this.saving = false;
            this.errorMessage = err.error?.message || 'Erreur lors de la validation.';
            this.cdr.markForCheck();
          }
        });
      }
    });
  }
}
