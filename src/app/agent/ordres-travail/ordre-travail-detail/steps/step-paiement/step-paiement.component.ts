import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepPaiementResponseDto, StatutOrdreTravail } from '../../../models/ordre-travail.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-step-paiement',
  standalone: true,
  imports: [CommonModule, RouterLink, AlertComponent],
  templateUrl: './step-paiement.component.html'
})
export class StepPaiementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private cdr = inject(ChangeDetectorRef);

  otId!: number;
  data: StepPaiementResponseDto | null = null;
  loading = true;
  advancing = false;
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
    this.otService.getStepPaiement(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de la facturation.';
        this.cdr.markForCheck();
      }
    });
  }

  continuerVersPretALivrer(): void {
    this.advancing = true;
    if (this.data?.statut === StatutOrdreTravail.PAIEMENT) {
      this.otService.updateStatut(this.otId, StatutOrdreTravail.PRET_A_LIVRER).subscribe({
        next: () => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-travail', this.otId, 'pret-a-livrer']);
        },
        error: () => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-travail', this.otId, 'pret-a-livrer']);
        }
      });
    } else {
      this.advancing = false;
      this.router.navigate(['/app/ordres-travail', this.otId, 'pret-a-livrer']);
    }
  }
}
