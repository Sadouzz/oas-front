import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepLivraisonResponseDto, StatutOrdreTravail } from '../../../models/ordre-travail.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-step-livraison',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-livraison.component.html'
})
export class StepLivraisonComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private cdr = inject(ChangeDetectorRef);

  otId!: number;
  data: StepLivraisonResponseDto | null = null;

  dateSortie = '';
  kilometrageSortie: number | null = null;
  remarquesClient = '';

  isAlreadyDelivered = false;
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
    this.otService.getStepLivraison(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.isAlreadyDelivered = res.statut === StatutOrdreTravail.LIVRE;
        if (res.dateSortie) {
          this.dateSortie = res.dateSortie.substring(0, 16);
        } else {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          this.dateSortie = now.toISOString().slice(0, 16);
        }
        this.kilometrageSortie = res.kilometrageSortie ?? null;
        this.remarquesClient = res.remarquesClient || '';
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des informations de livraison.';
        this.cdr.markForCheck();
      }
    });
  }

  confirmerLivraison(): void {
    if (!this.kilometrageSortie || this.kilometrageSortie < 0) {
      this.errorMessage = 'Veuillez saisir un kilométrage de sortie valide.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      dateSortie: this.dateSortie ? new Date(this.dateSortie).toISOString() : new Date().toISOString(),
      kilometrageSortie: this.kilometrageSortie,
      remarquesClient: this.remarquesClient,
      statut: StatutOrdreTravail.LIVRE
    };

    this.otService.updateStepLivraison(this.otId, payload).subscribe({
      next: () => {
        this.saving = false;
        this.isAlreadyDelivered = true;
        this.successMessage = 'Ordre de Travail clôturé. Véhicule remis au client avec succès !';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la confirmation de livraison.';
        this.cdr.markForCheck();
      }
    });
  }
}
