import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { OrdreReparation } from '../../../../../shared/models';

@Component({
  selector: 'app-step-reparation',
  standalone: true,
  imports: [CommonModule, AlertComponent],
  templateUrl: './step-reparation.component.html'
})
export class StepReparationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;

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
    this.ordreService.getById(this.ordreId).subscribe({
      next: (o: OrdreReparation) => {
        this.loadedOrdre = o;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de l\'ordre.';
        this.cdr.markForCheck();
      }
    });
  }

  validateStep(): void {
    this.terminerReparation();
  }

  terminerReparation(): void {
    this.saving = true;
    this.ordreService.updateStatut(this.ordreId, 'EN_ATTENTE_PAIEMENT').subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Travaux terminés avec succès. Redirection vers la facturation...';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'paiement']);
        }, 800);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la clôture des travaux.';
        this.cdr.markForCheck();
      }
    });
  }
}
