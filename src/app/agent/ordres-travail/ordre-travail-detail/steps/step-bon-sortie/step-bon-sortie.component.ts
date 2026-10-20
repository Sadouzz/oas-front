import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepBonSortieResponseDto, StatutOrdreTravail } from '../../../models/ordre-travail.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-step-bon-sortie',
  standalone: true,
  imports: [CommonModule, RouterLink, AlertComponent],
  templateUrl: './step-bon-sortie.component.html'
})
export class StepBonSortieComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private cdr = inject(ChangeDetectorRef);

  otId!: number;
  data: StepBonSortieResponseDto | null = null;
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
    this.otService.getStepBonSortie(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement du Bon de Sortie.';
        this.cdr.markForCheck();
      }
    });
  }

  continuerVersAssignation(): void {
    this.advancing = true;
    if (this.data?.statut === StatutOrdreTravail.BON_DE_SORTIE) {
      this.otService.updateStatut(this.otId, StatutOrdreTravail.ASSIGN_TECHNICIEN).subscribe({
        next: () => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-travail', this.otId, 'assignation']);
        },
        error: () => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-travail', this.otId, 'assignation']);
        }
      });
    } else {
      this.advancing = false;
      this.router.navigate(['/app/ordres-travail', this.otId, 'assignation']);
    }
  }
}
