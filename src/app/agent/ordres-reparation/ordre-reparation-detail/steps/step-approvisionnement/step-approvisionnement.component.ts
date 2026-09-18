import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { BonDeCommandeService } from '../../../../bons-commande/bon-de-commande.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { OrdreReparation } from '../../../../../shared/models';
import { LignePiece } from '../step-pieces-mo/step-pieces-mo.component';

@Component({
  selector: 'app-step-approvisionnement',
  standalone: true,
  imports: [CommonModule, AlertComponent],
  templateUrl: './step-approvisionnement.component.html'
})
export class StepApprovisionnementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private bdcService = inject(BonDeCommandeService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;
  lignesPieces: LignePiece[] = [];

  loading = true;
  saving = false;
  bdcSaving = false;
  showBDCModal = false;
  errorMessage = '';
  successMessage = '';

  get hasRuptureStock(): boolean {
    return this.lignesPieces.some(l => !l.isCustom && l.manquant > 0);
  }

  get rupturesOnly(): LignePiece[] {
    return this.lignesPieces.filter(l => !l.isCustom && l.manquant > 0);
  }

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
        this.lignesPieces = (o.lignesOrdreReparationPieces || []).map((l: any) => ({
          piece: l.piece,
          pieceIdTemp: l.piece?.id,
          quantite: l.quantite,
          isCustom: l.isCustom,
          designationPds: l.designationPds,
          prixUnitaire: l.prix,
          stockDisponible: l.isCustom ? 0 : (l.piece?.stockMagasin ?? 0) + (l.piece?.stockAtelier ?? 0),
          manquant: l.isCustom ? 0 : Math.max(0, l.quantite - (l.piece?.stockAtelier ?? 0)),
          aSortirMagasin: l.isCustom ? 0 : (Math.max(0, l.quantite - (l.piece?.stockAtelier ?? 0)) > 0 ? 0 : 1)
        }));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement.';
        this.cdr.markForCheck();
      }
    });
  }

  openBDCModal(): void {
    this.showBDCModal = true;
  }

  closeBDCModal(): void {
    this.showBDCModal = false;
  }

  createBonDeCommande(): void {
    const lignes = this.rupturesOnly.map(l => ({
      pieceId: l.piece!.id,
      quantiteCommandee: l.manquant,
      prixUnitaire: l.piece!.prix || 0
    }));

    this.bdcSaving = true;
    this.bdcService.create({
      fournisseurId: null as any,
      ordreReparationId: this.ordreId,
      lignes
    } as any).subscribe({
      next: () => {
        this.ordreService.updateStatut(this.ordreId, 'EN_ATTENTE_SORTIE').subscribe({
          next: () => {
            this.bdcSaving = false;
            this.showBDCModal = false;
            this.successMessage = 'Bon de commande créé avec succès. Redirection vers le bon de sortie...';
            this.cdr.markForCheck();
            this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
          },
          error: () => {
            this.bdcSaving = false;
            this.showBDCModal = false;
            this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
          }
        });
      },
      error: (err) => {
        this.bdcSaving = false;
        this.errorMessage = err.error?.message || 'Erreur création bon de commande.';
        this.cdr.markForCheck();
      }
    });
  }

  validateStep(): void {
    if (this.hasRuptureStock) {
      this.openBDCModal();
    } else {
      this.passerEtapeSuivante();
    }
  }

  passerEtapeSuivante(): void {
    this.ordreService.updateStatut(this.ordreId, 'EN_ATTENTE_SORTIE').subscribe({
      next: () => {
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
      },
      error: () => {
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
      }
    });
  }
}
