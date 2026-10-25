import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepBonSortieResponseDto, StatutOrdreTravail, PieceBonSortieDto, OrdreTravail } from '../../../models/ordre-travail.model';
import { BonDeSortieService } from '../../../../bons-de-sortie/bon-de-sortie.service';
import { BonDeSortie, BonDeSortieRequest } from '../../../../bons-de-sortie/models/bon-de-sortie.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { AuthService } from '../../../../../core/services/auth.service';

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
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  otId!: number;
  data: StepBonSortieResponseDto | null = null;
  loadedOT: OrdreTravail | null = null;
  fullBonDeSortie: BonDeSortie | null = null;
  bonsDeSortie: BonDeSortie[] = [];
  selectedBonDetail: BonDeSortie | null = null;

  piecesToIssue: PieceSortieItem[] = [];
  remarque = '';

  loading = true;
  loadingBDS = false;
  creating = false;
  validating = false;
  advancing = false;

  showValidateModal = false;
  showPiecesIncompletesModal = false;
  errorMessage = '';
  successMessage = '';

  get canValidateBonDeSortie(): boolean {
    const role = this.authService.getRole() ?? '';
    return ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT'].includes(role);
  }

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

  normaliserBon(bon: any): BonDeSortie {
    if (!bon) return bon;
    if (bon.lignesPieces && (!bon.lignesBonDeSortiePieces || bon.lignesBonDeSortiePieces.length === 0)) {
      bon.lignesBonDeSortiePieces = [
        ...bon.lignesPieces,
        ...(bon.lignesMainDoeuvres || []).map((m: any) => ({
          id: m.id,
          mainDoeuvreId: m.mainDoeuvreId,
          type: 'MAIN_DOEUVRE',
          designation: m.designation || m.code || 'Main d\'œuvre',
          quantite: m.nbreHeure ?? m.quantite ?? 1,
          prix: m.tarifHoraire ?? m.prix ?? 0,
          tauxRemise: m.tauxRemise ?? 0,
          montantTotal: m.montantTotal
        }))
      ];
    }
    return bon;
  }

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.otService.getStepBonSortie(this.otId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.data = res;
          this.bonsDeSortie = (res.bonsDeSortie || []).map(b => this.normaliserBon(b));
          this.loading = false;
          this.initPieces(res);

          // Si le backend renvoie directement le bon de sortie
          if (res.bonDeSortie?.id && this.bonsDeSortie.length === 0) {
            this.loadFullBonDeSortie(res.bonDeSortie.id);
          } else if (this.fullBonDeSortie?.id) {
            // Si un bon de sortie a déjà été créé ou chargé localement, on le conserve !
            this.patchDataWithBon(this.fullBonDeSortie);
            this.loadFullBonDeSortie(this.fullBonDeSortie.id);
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

  patchDataWithBon(bon: any): void {
    if (!this.data) return;
    const b = this.normaliserBon(bon);
    this.data.hasBonDeSortie = true;
    this.data.bonDeSortie = {
      id: b.id,
      reference: b.reference || ('BS #' + b.id),
      numero: b.reference || ('BS #' + b.id),
      statut: b.statut || 'EN_ATTENTE',
      dateSortiePrevue: b.date,
      dateSortieEffective: b.dateValidation || undefined,
      remarques: b.remarque,
      remarque: b.remarque,
      lignesBonDeSortiePieces: b.lignesBonDeSortiePieces || []
    };
  }

  loadFullBonDeSortie(bonId: number): void {
    this.loadingBDS = true;
    this.bdsService.getById(bonId).subscribe({
      next: (bon) => {
        this.ngZone.run(() => {
          this.fullBonDeSortie = this.normaliserBon(bon);
          this.patchDataWithBon(this.fullBonDeSortie);
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

  get piecesRequises(): PieceBonSortieDto[] {
    return this.data?.piecesManquantesProforma || [];
  }

  getResteASortir(p: PieceBonSortieDto): number {
    if (p.quantiteASortir != null) {
      return Number(p.quantiteASortir);
    }
    const demandee = Number(p.quantiteDemandee) || 0;
    const sortie = Number(p.quantiteSortie) || 0;
    return Math.max(0, demandee - sortie);
  }

  getQuantiteSortie(p: PieceBonSortieDto): number {
    if (p.quantiteSortie != null) {
      return Number(p.quantiteSortie);
    }
    const demandee = Number(p.quantiteDemandee) || 0;
    const aSortir = Number(p.quantiteASortir) || 0;
    return Math.max(0, demandee - aSortir);
  }

  get totalQuantiteDemandee(): number {
    if (this.piecesRequises.length > 0) {
      return this.piecesRequises.reduce((acc, p) => acc + (Number(p.quantiteDemandee) || 0), 0);
    }
    return this.piecesToIssue.reduce((acc, p) => acc + (p.quantiteDemandee || 0), 0);
  }

  get totalQuantiteSortie(): number {
    return this.piecesRequises.reduce((acc, p) => acc + this.getQuantiteSortie(p), 0);
  }

  get totalQuantiteRestante(): number {
    return this.piecesRequises.reduce((acc, p) => acc + this.getResteASortir(p), 0);
  }

  get isToutesPiecesSorties(): boolean {
    if (this.piecesRequises.length === 0) return true;
    return this.piecesRequises.every(p => this.getResteASortir(p) <= 0);
  }

  get isPartiellementSorti(): boolean {
    return this.totalQuantiteSortie > 0 && this.totalQuantiteRestante > 0;
  }

  get selectedPieces(): PieceSortieItem[] {
    return this.piecesToIssue.filter(p => p.selected);
  }

  get totalQuantiteASortir(): number {
    return this.selectedPieces.reduce((acc: number, p: PieceSortieItem) => acc + (Number(p.quantiteASortir) || 0), 0);
  }

  get totalValeurEstimee(): number {
    return this.selectedPieces.reduce((acc: number, p: PieceSortieItem) => {
      const qte = Number(p.quantiteASortir) || 0;
      const pu = Number(p.prixUnitaire) || 0;
      return acc + (qte * pu);
    }, 0);
  }

  get hasStockInsuffisant(): boolean {
    return this.selectedPieces.some((p: PieceSortieItem) => (Number(p.stockMagasin) || 0) < (Number(p.quantiteASortir) || 0));
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

  quantitePiecesBon(bon: BonDeSortie): number {
    const lignes = bon.lignesPieces || bon.lignesBonDeSortiePieces || [];
    return lignes.reduce((total, ligne) => total + (ligne.type === 'MAIN_DOEUVRE' ? 0 : Number(ligne.quantite) || 0), 0);
  }

  get quantitePiecesTotale(): number {
    return this.bonsDeSortie.reduce((total, bon) => total + this.quantitePiecesBon(bon), 0);
  }

  get montantBonsTotal(): number {
    return this.bonsDeSortie.reduce((total, bon) => total + Number(bon.montantTotal || 0), 0);
  }

  get canPasserAEtapeSuivante(): boolean {
    return this.piecesRequises.length === 0 || this.bonsDeSortie.length > 0 || this.hasBonDeSortie();
  }

  isPieceDansProforma(ligne: any): boolean {
    if (!ligne) return false;
    if (this.piecesRequises.length === 0) return false;
    const pieceId = ligne.pieceId || ligne.piece?.id;
    const designation = (ligne.designation || ligne.piece?.designation || '').trim().toLowerCase();
    const reference = (ligne.reference || ligne.piece?.reference || '').trim().toLowerCase();

    return this.piecesRequises.some(p => {
      if (pieceId && p.pieceId && p.pieceId === pieceId) return true;
      if (reference && p.reference && p.reference.trim().toLowerCase() === reference) return true;
      if (designation && p.designation && p.designation.trim().toLowerCase() === designation) return true;
      return false;
    });
  }

  get modalPieces(): any[] {
    if (!this.selectedBonDetail) return [];
    if (this.selectedBonDetail.lignesPieces && this.selectedBonDetail.lignesPieces.length > 0) {
      return this.selectedBonDetail.lignesPieces;
    }
    return (this.selectedBonDetail.lignesBonDeSortiePieces || []).filter((l: any) => l.type !== 'MAIN_DOEUVRE');
  }

  get modalMainDoeuvres(): any[] {
    if (!this.selectedBonDetail) return [];
    if (this.selectedBonDetail.lignesMainDoeuvres && this.selectedBonDetail.lignesMainDoeuvres.length > 0) {
      return this.selectedBonDetail.lignesMainDoeuvres;
    }
    return (this.selectedBonDetail.lignesBonDeSortiePieces || []).filter((l: any) => l.type === 'MAIN_DOEUVRE');
  }

  get sousTotalPieces(): number {
    if (this.selectedBonDetail?.montantTotalPieces != null) {
      return this.selectedBonDetail.montantTotalPieces;
    }
    return this.modalPieces.reduce((acc, p) => acc + (p.montantTotal != null ? Number(p.montantTotal) : ((Number(p.prix) || 0) * (Number(p.quantite) || 0))), 0);
  }

  get sousTotalMainDoeuvre(): number {
    if (this.selectedBonDetail?.montantTotalMainDoeuvre != null) {
      return this.selectedBonDetail.montantTotalMainDoeuvre;
    }
    return this.modalMainDoeuvres.reduce((acc, m) => acc + (m.montantTotal != null ? Number(m.montantTotal) : ((Number(m.tarifHoraire ?? m.prix) || 0) * (Number(m.nbreHeure ?? m.quantite) || 0))), 0);
  }

  // --- Création du Bon de Sortie ---

  creerBonDeSortie(): void {
    if (!this.data) return;
    const clientId = this.data.clientId || this.loadedOT?.client?.id || this.loadedOT?.vehicule?.client?.id;
    const vehiculeId = this.data.vehiculeId || this.loadedOT?.vehicule?.id;
    if (!clientId || !vehiculeId || !this.data.ordreReparationId) {
      this.errorMessage = 'Le client, le véhicule et l’ordre de réparation sont requis pour créer le BS.';
      return;
    }
    this.router.navigate(['/app/bons-de-sortie'], {
      queryParams: { action: 'new', clientId, vehiculeId, ordreReparationId: this.data.ordreReparationId, ordreTravailId: this.otId }
    });
  }

  ouvrirDetailBon(bon: BonDeSortie): void {
    this.selectedBonDetail = this.normaliserBon(bon);
    this.bdsService.getById(bon.id).subscribe({
      next: full => {
        this.selectedBonDetail = this.normaliserBon(full);
        this.cdr.detectChanges();
      }
    });
  }

  // --- Validation du Bon de Sortie ---

  openValidateModal(): void {
    if (!this.canValidateBonDeSortie) return;
    this.showValidateModal = true;
    this.cdr.detectChanges();
  }

  closeValidateModal(): void {
    if (this.validating) return;
    this.showValidateModal = false;
    this.cdr.detectChanges();
  }

  confirmerValidation(): void {
    if (!this.canValidateBonDeSortie) return;
    const bonId = this.fullBonDeSortie?.id || this.selectedBonDetail?.id || this.data?.bonDeSortie?.id;
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
          const ref = validated?.reference || this.fullBonDeSortie?.reference || this.selectedBonDetail?.reference || ('#' + bonId);
          this.successMessage = `Bon de Sortie ${ref} validé avec succès ! Sortie atelier effectuée.`;

          if (this.selectedBonDetail && this.selectedBonDetail.id === bonId) {
            this.selectedBonDetail.statut = 'VALIDE';
            if (validated) {
              this.selectedBonDetail = this.normaliserBon(validated);
            }
          }

          if (validated) {
            this.fullBonDeSortie = this.normaliserBon(validated);
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
          const msg = err.error?.message || (typeof err.error === 'string' ? err.error : '') || err.message || '';
          this.errorMessage = msg || 'Erreur lors de la validation du Bon de Sortie.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // --- Navigation vers étape suivante ---

  continuerVersAssignation(): void {
    if (!this.canPasserAEtapeSuivante) {
      this.errorMessage = 'Créez au moins un Bon de Sortie lié à cet ordre avant de continuer.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.isToutesPiecesSorties) {
      this.showPiecesIncompletesModal = true;
      this.cdr.detectChanges();
      return;
    }

    this.procederVersAssignation();
  }

  procederVersAssignation(): void {
    this.showPiecesIncompletesModal = false;
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
