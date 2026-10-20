import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepBonSortieResponseDto, StatutOrdreTravail, PieceBonSortieDto, OrdreTravail } from '../../../models/ordre-travail.model';
import { BonDeSortieService } from '../../../../bons-de-sortie/bon-de-sortie.service';
import { BonDeSortie, BonDeSortieRequest } from '../../../../bons-de-sortie/models/bon-de-sortie.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

export interface PieceSortieItem extends PieceBonSortieDto {
  selected: boolean;
}

@Component({
  selector: 'app-step-bon-sortie',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-bon-sortie.component.html'
})
export class StepBonSortieComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private bdsService = inject(BonDeSortieService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  otId!: number;
  data: StepBonSortieResponseDto | null = null;
  loadedOT: OrdreTravail | null = null;
  fullBonDeSortie: BonDeSortie | null = null;

  piecesToIssue: PieceSortieItem[] = [];
  remarque = '';

  loading = true;
  loadingBDS = false;
  creating = false;
  validating = false;
  advancing = false;

  showValidateModal = false;
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
    this.loadOTSummary();
  }

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.otService.getStepBonSortie(this.otId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.data = res;
          this.loading = false;
          this.initPieces(res);

          // Si le backend renvoie directement le bon de sortie
          if (res.bonDeSortie?.id) {
            this.loadFullBonDeSortie(res.bonDeSortie.id);
          } else if (this.fullBonDeSortie?.id) {
            // Si un bon de sortie a déjà été créé ou chargé localement, on le conserve !
            this.patchDataWithBon(this.fullBonDeSortie);
            this.loadFullBonDeSortie(this.fullBonDeSortie.id);
          } else if (res.vehiculeId) {
            // Recherche automatique si un bon de sortie existe déjà pour ce véhicule / ordre
            this.searchExistingBonDeSortie(res.vehiculeId, res.ordreReparationId);
          } else {
            this.fullBonDeSortie = null;
          }

          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Erreur lors du chargement du Bon de Sortie.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  loadOTSummary(): void {
    this.otService.getSummary(this.otId).subscribe({
      next: (ot) => {
        this.ngZone.run(() => {
          this.loadedOT = ot;
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }

  searchExistingBonDeSortie(vehiculeId: number, ordreReparationId?: number): void {
    this.bdsService.getAll({ vehiculeId }).subscribe({
      next: (bons) => {
        this.ngZone.run(() => {
          const list = Array.isArray(bons) ? bons : ((bons as any)?.data?.content || (bons as any)?.content || (bons as any)?.data || []);
          if (list && list.length > 0) {
            // Chercher le bon qui correspond à cet ordre de réparation ou ordre de travail
            const match = list.find((b: any) =>
              (ordreReparationId && (b.ordreReparationId === ordreReparationId || b.ordreReparation?.id === ordreReparationId)) ||
              (b.ordreTravailId === this.otId || b.ordreTravail?.id === this.otId)
            ) || list[0];

            if (match) {
              this.fullBonDeSortie = match;
              this.patchDataWithBon(match);
              if (match.id) {
                this.loadFullBonDeSortie(match.id);
              }
            }
          }
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  patchDataWithBon(bon: any): void {
    if (!this.data) return;
    this.data.hasBonDeSortie = true;
    this.data.bonDeSortie = {
      id: bon.id,
      reference: bon.reference || ('BS #' + bon.id),
      numero: bon.reference || ('BS #' + bon.id),
      statut: bon.statut || 'EN_ATTENTE',
      dateSortiePrevue: bon.date,
      dateSortieEffective: bon.dateValidation || undefined,
      remarques: bon.remarque,
      remarque: bon.remarque,
      lignesBonDeSortiePieces: bon.lignesBonDeSortiePieces || []
    };
  }

  loadFullBonDeSortie(bonId: number): void {
    this.loadingBDS = true;
    this.bdsService.getById(bonId).subscribe({
      next: (bon) => {
        this.ngZone.run(() => {
          this.fullBonDeSortie = bon;
          this.patchDataWithBon(bon);
          this.loadingBDS = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.loadingBDS = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  initPieces(res: StepBonSortieResponseDto): void {
    const list = res.piecesManquantesProforma || [];
    this.piecesToIssue = list.map((p) => {
      const qte = p.quantiteASortir != null && p.quantiteASortir > 0
        ? p.quantiteASortir
        : (p.quantiteDemandee || 1);
      return {
        ...p,
        quantiteASortir: qte,
        selected: true
      };
    });
  }

  // --- Sélections & Totaux ---

  get allSelected(): boolean {
    return this.piecesToIssue.length > 0 && this.piecesToIssue.every(p => p.selected);
  }

  get someSelected(): boolean {
    return this.piecesToIssue.some(p => p.selected);
  }

  toggleSelectAll(checked: boolean): void {
    this.piecesToIssue.forEach(p => (p.selected = checked));
    this.cdr.detectChanges();
  }

  get selectedPieces(): PieceSortieItem[] {
    return this.piecesToIssue.filter(p => p.selected);
  }

  get totalQuantiteDemandee(): number {
    return this.piecesToIssue.reduce((acc, p) => acc + (p.quantiteDemandee || 0), 0);
  }

  get totalQuantiteASortir(): number {
    return this.selectedPieces.reduce((acc, p) => acc + (Number(p.quantiteASortir) || 0), 0);
  }

  get totalValeurEstimee(): number {
    return this.selectedPieces.reduce((acc, p) => {
      const qte = Number(p.quantiteASortir) || 0;
      const pu = Number(p.prixUnitaire) || 0;
      return acc + (qte * pu);
    }, 0);
  }

  get hasStockInsuffisant(): boolean {
    return this.selectedPieces.some(p => (Number(p.stockMagasin) || 0) < (Number(p.quantiteASortir) || 0));
  }

  isBonValide(): boolean {
    const bds = this.fullBonDeSortie || this.data?.bonDeSortie;
    return bds?.statut === 'VALIDE' || bds?.statut === 'LIVRE';
  }

  hasBonDeSortie(): boolean {
    return !!(
      this.fullBonDeSortie?.id ||
      this.data?.bonDeSortie?.id ||
      this.data?.hasBonDeSortie
    );
  }

  get canPasserAEtapeSuivante(): boolean {
    // Si aucune pièce n'est requise et aucun bon n'existe, on peut avancer
    if (!this.hasBonDeSortie() && this.piecesToIssue.length === 0) {
      return true;
    }
    // Dès lors qu'un bon existe ou que des pièces sont requises, le bon doit obligatoirement être validé
    return this.isBonValide();
  }

  // --- Création du Bon de Sortie ---

  creerBonDeSortie(): void {
    if (!this.data) return;

    const selected = this.selectedPieces;
    if (selected.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins une pièce pour créer le Bon de Sortie.';
      this.cdr.detectChanges();
      return;
    }

    for (const p of selected) {
      const qte = Number(p.quantiteASortir) || 0;
      if (qte <= 0) {
        this.errorMessage = `La quantité à sortir pour "${p.designation}" doit être supérieure à 0.`;
        this.cdr.detectChanges();
        return;
      }
    }

    this.creating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    const clientId = this.data.clientId || this.loadedOT?.client?.id || this.loadedOT?.vehicule?.client?.id || 0;
    const vehiculeId = this.data.vehiculeId || this.loadedOT?.vehicule?.id || 0;
    const ordreReparationId = this.data.ordreReparationId || this.loadedOT?.ordreReparationId;

    const lignesPieces = selected.map(p => ({
      pieceId: p.pieceId || null,
      quantite: Number(p.quantiteASortir) || 1,
      prix: p.prixUnitaire ?? null,
      prixUnitaire: p.prixUnitaire ?? null,
      isCustom: !p.pieceId,
      designationPds: p.designation
    }));

    const defaultRemarque = `Sortie magasin pour OT ${this.data.numero || ('#' + this.otId)}${this.data.proformaNumero ? ' (Proforma ' + this.data.proformaNumero + ')' : ''}`;

    const payload: BonDeSortieRequest = {
      clientId,
      vehiculeId,
      ordreReparationId: ordreReparationId ?? undefined,
      ordreTravailId: this.otId,
      lignesPieces,
      remarque: this.remarque.trim() || defaultRemarque
    };

    this.bdsService.creer(payload).subscribe({
      next: (createdBS: any) => {
        this.ngZone.run(() => {
          this.creating = false;
          const ref = createdBS?.reference || ('#' + createdBS?.id);
          this.successMessage = `Bon de Sortie ${ref} créé avec succès avec toutes les pièces ! Vous pouvez désormais le valider ci-dessous.`;

          // 1. Immédiatement mettre à jour l'état avec le Bon de Sortie créé
          if (createdBS) {
            this.fullBonDeSortie = createdBS;
            this.patchDataWithBon(createdBS);
          }

          // 2. Synchroniser vers le backend si l'endpoint de synchronisation d'étape existe
          if (createdBS?.id) {
            this.otService.updateStepBonSortie(this.otId, {
              bonDeSortieId: createdBS.id,
              statut: StatutOrdreTravail.BON_DE_SORTIE
            }).subscribe({
              next: () => {},
              error: () => {}
            });
            this.loadFullBonDeSortie(createdBS.id);
          }

          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.creating = false;
          this.errorMessage = err.error?.message || err.message || 'Erreur lors de la création du Bon de Sortie.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // --- Validation du Bon de Sortie ---

  openValidateModal(): void {
    this.showValidateModal = true;
    this.cdr.detectChanges();
  }

  closeValidateModal(): void {
    if (this.validating) return;
    this.showValidateModal = false;
    this.cdr.detectChanges();
  }

  confirmerValidation(): void {
    const bonId = this.fullBonDeSortie?.id || this.data?.bonDeSortie?.id;
    if (!bonId) {
      this.errorMessage = 'Aucun Bon de Sortie trouvé à valider.';
      this.cdr.detectChanges();
      return;
    }

    this.validating = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.bdsService.valider(bonId).subscribe({
      next: (validated: any) => {
        this.ngZone.run(() => {
          this.validating = false;
          this.showValidateModal = false;
          const ref = validated?.reference || ('#' + bonId);
          this.successMessage = `Bon de Sortie ${ref} validé avec succès ! Les pièces ont été déstockées vers l'atelier.`;

          if (validated) {
            this.fullBonDeSortie = validated;
            this.patchDataWithBon(validated);
          } else if (this.fullBonDeSortie) {
            this.fullBonDeSortie.statut = 'VALIDE';
            this.patchDataWithBon(this.fullBonDeSortie);
          }

          this.loadData();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.validating = false;
          this.errorMessage = err.error?.message || err.message || 'Erreur lors de la validation du Bon de Sortie.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // --- Navigation vers étape suivante ---

  continuerVersAssignation(): void {
    if (!this.canPasserAEtapeSuivante) {
      this.errorMessage = 'Le Bon de Sortie doit obligatoirement être validé avant de pouvoir passer à l\'affectation des techniciens.';
      this.cdr.detectChanges();
      return;
    }

    this.advancing = true;
    this.cdr.detectChanges();

    if (this.data?.statut === StatutOrdreTravail.BON_DE_SORTIE) {
      this.otService.updateStatut(this.otId, StatutOrdreTravail.ASSIGN_TECHNICIEN).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.advancing = false;
            this.router.navigate(['/app/ordres-travail', this.otId, 'assignation']);
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.advancing = false;
            this.router.navigate(['/app/ordres-travail', this.otId, 'assignation']);
          });
        }
      });
    } else {
      this.advancing = false;
      this.router.navigate(['/app/ordres-travail', this.otId, 'assignation']);
    }
  }
}
