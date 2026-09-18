import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { BonDeSortieService } from '../../../../bons-de-sortie/bon-de-sortie.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { OrdreReparation } from '../../../../../shared/models';

@Component({
  selector: 'app-step-bon-sortie',
  standalone: true,
  imports: [CommonModule, AlertComponent],
  templateUrl: './step-bon-sortie.component.html'
})
export class StepBonSortieComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private bdsService = inject(BonDeSortieService);
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
    this.creerBonDeSortie();
  }

  creerBonDeSortie(): void {
    if (!this.loadedOrdre) return;
    this.saving = true;

    const clientId = this.loadedOrdre.vehicule?.client?.id || 0;
    const vehiculeId = this.loadedOrdre.vehicule?.id || 0;

    const lignes = (this.loadedOrdre.lignesOrdreReparationPieces || []).map((l: any) => ({
      pieceId: l.piece ? l.piece.id : null,
      quantite: l.quantite,
      prix: l.prix || l.piece?.prix || null,
      isCustom: !!l.isCustom,
      designationPds: l.designationPds
    }));

    this.bdsService.creer({
      clientId,
      vehiculeId,
      ordreReparationId: this.ordreId,
      lignesPieces: lignes,
      remarque: `BDS généré pour ordre ${this.loadedOrdre.numero || this.ordreId}`
    }).subscribe({
      next: () => {
        this.ordreService.updateStatut(this.ordreId, 'ASSIGN_TECHNICIEN').subscribe({
          next: () => {
            this.saving = false;
            this.successMessage = 'Bon de sortie créé avec succès. Redirection vers l\'assignation...';
            this.cdr.markForCheck();
            this.router.navigate(['/app/ordres-reparation', this.ordreId, 'assignation']);
          },
          error: () => {
            this.saving = false;
            this.router.navigate(['/app/ordres-reparation', this.ordreId, 'assignation']);
          }
        });
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la création du bon de sortie.';
        this.cdr.markForCheck();
      }
    });
  }
}
