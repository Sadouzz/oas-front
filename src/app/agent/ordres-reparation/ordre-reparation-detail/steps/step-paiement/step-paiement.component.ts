import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { FactureService } from '../../../../factures/facture.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { OrdreReparation } from '../../../../../shared/models';

@Component({
  selector: 'app-step-paiement',
  standalone: true,
  imports: [CommonModule, NgClass, AlertComponent],
  templateUrl: './step-paiement.component.html'
})
export class StepPaiementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private factureService = inject(FactureService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;
  selectedOrdreInvoice: any = null;

  loading = true;
  isLoadingFacture = false;
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
        this.loadInvoice();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur chargement ordre.';
        this.cdr.markForCheck();
      }
    });
  }

  loadInvoice(): void {
    this.isLoadingFacture = true;
    this.factureService.getAll().subscribe({
      next: (list: any[]) => {
        if (list && list.length) {
          const inv = list.find(it =>
            (it.ordreReparationId && Number(it.ordreReparationId) === Number(this.ordreId)) ||
            (it.ordreReparation && Number(it.ordreReparation.id) === Number(this.ordreId))
          );
          this.selectedOrdreInvoice = inv || null;
        } else {
          this.selectedOrdreInvoice = null;
        }
        this.isLoadingFacture = false;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.selectedOrdreInvoice = null;
        this.isLoadingFacture = false;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  validateStep(): void {
    this.validerPaiement();
  }

  validerPaiement(): void {
    this.saving = true;
    this.ordreService.updateStatut(this.ordreId, 'TERMINE').subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Paiement validé. Véhicule prêt pour livraison.';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'livraison']);
        }, 800);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la validation du paiement.';
        this.cdr.markForCheck();
      }
    });
  }
}
