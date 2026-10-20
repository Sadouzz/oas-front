import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { ProformaService } from '../../../../proforma/proforma.service';
import { FiscalConfigurationService } from '../../../../gestion-tva/fiscal-configuration.service';
import { OrdreTravailService } from '../../../../ordres-travail/ordre-travail.service';
import { OrdreTravail } from '../../../../ordres-travail/models/ordre-travail.model';

import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import {
  OrdreReparation,
  ProformaRequest,
  extractContent
} from '../../../../../shared/models';
import { StepProformaResponseDto } from '../../../models/responses';

@Component({
  selector: 'app-step-proforma',
  standalone: true,
  imports: [CommonModule, AlertComponent, RouterLink],
  templateUrl: './step-proforma.component.html'
})
export class StepProformaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private proformaService = inject(ProformaService);
  private fiscalConfigurationService = inject(FiscalConfigurationService);
  private otService = inject(OrdreTravailService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: StepProformaResponseDto | null = null;
  proformaChargee: any = null;
  private defaultTvaRate = 18;
  existingOT: OrdreTravail | null = null;

  loading = true;
  saving = false;
  creationOTEnCours = false;
  errorMessage = '';
  successMessage = '';

  showModalEnvoi = false;
  showModalValider = false;
  envoiEnCours = false;
  validationEnCours = false;

  ngOnInit(): void {
    this.fiscalConfigurationService.getCurrent().subscribe({
      next: config => { this.defaultTvaRate = config.tvaRate; this.cdr.markForCheck(); },
      error: () => undefined,
    });
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
    this.ordreService.getStepProforma(this.ordreId).subscribe({
      next: (res) => {
        this.loadedOrdre = res;
        this.proformaChargee = res.proforma || null;
        this.loading = false;
        this.checkExistingOT();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des données.';
        this.cdr.markForCheck();
      }
    });
  }

  checkExistingOT(): void {
    this.otService.getByOrdreReparationId(this.ordreId).subscribe({
      next: (ot) => {
        this.existingOT = ot;
        this.cdr.markForCheck();
      },
      error: () => {
        this.existingOT = null;
        this.cdr.markForCheck();
      }
    });
  }

  genererProforma(): void {
    // Avec la nouvelle architecture, la génération ou synchronisation se fait côté backend.
    // On appelle updateStepProforma pour déclencher la synchro.
    this.saving = true;
    this.ordreService.updateStepProforma(this.ordreId, { numero: this.loadedOrdre?.numero || '' }).subscribe({
      next: () => {
        this.loadData(); // Recharger les données complètes avec la proforma mise à jour
        this.successMessage = 'Proforma générée/actualisée avec succès.';
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la génération de la proforma.';
        this.cdr.markForCheck();
      }
    });
  }

  actualiserProforma(): void {
    this.genererProforma();
  }

  telechargementEnCours = false;

  get lignesPiecesAffichees(): any[] {
    if (this.proformaChargee?.lignesPieces && this.proformaChargee.lignesPieces.length > 0) {
      return this.proformaChargee.lignesPieces;
    }
    if (this.proformaChargee?.lignesPiece && this.proformaChargee.lignesPiece.length > 0) {
      return this.proformaChargee.lignesPiece;
    }
    // Tolérance si le backend renvoie les lignes à la racine du DTO
    if ((this.loadedOrdre as any)?.lignesPieces && (this.loadedOrdre as any).lignesPieces.length > 0) {
      return (this.loadedOrdre as any).lignesPieces;
    }
    return [];
  }

  get lignesMainDoeuvreAffichees(): any[] {
    if (this.proformaChargee?.lignesMainDoeuvres && this.proformaChargee.lignesMainDoeuvres.length > 0) {
      return this.proformaChargee.lignesMainDoeuvres;
    }
    if (this.proformaChargee?.lignesMainDoeuvre && this.proformaChargee.lignesMainDoeuvre.length > 0) {
      return this.proformaChargee.lignesMainDoeuvre;
    }
    // Tolérance si le backend renvoie les lignes à la racine du DTO
    if ((this.loadedOrdre as any)?.lignesMainDoeuvres && (this.loadedOrdre as any).lignesMainDoeuvres.length > 0) {
      return (this.loadedOrdre as any).lignesMainDoeuvres;
    }
    return [];
  }

  get hasArticles(): boolean {
    return this.lignesPiecesAffichees.length > 0 || this.lignesMainDoeuvreAffichees.length > 0;
  }

  getPieceDesignation(ligne: any): string {
    return ligne?.nom || ligne?.designationPiece || ligne?.designationPds || ligne?.piece?.designation || ligne?.piece?.reference || 'Pièce';
  }

  getPieceReference(ligne: any): string {
    return ligne?.piece?.reference || '';
  }

  getPieceType(ligne: any): string {
    if (ligne?.isCustom || ligne?.designationPds) return 'PDS';
    return ligne?.type || ligne?.piece?.type || 'CAT';
  }

  getPieceQuantite(ligne: any): number {
    return Number(ligne?.quantite) || 0;
  }

  getPiecePrixUnitaire(ligne: any): number {
    if (ligne?.prix != null && Number(ligne.prix) > 0) return Number(ligne.prix);
    if (ligne?.prixUnitaire != null && Number(ligne.prixUnitaire) > 0) return Number(ligne.prixUnitaire);
    if (ligne?.piece?.prix != null && Number(ligne.piece.prix) > 0) return Number(ligne.piece.prix);
    return 0;
  }

  getPieceTotal(ligne: any): number {
    if (ligne?.montantTotal != null && Number(ligne.montantTotal) > 0) return Number(ligne.montantTotal);
    if (ligne?.total != null && Number(ligne.total) > 0) return Number(ligne.total);
    return this.getPiecePrixUnitaire(ligne) * this.getPieceQuantite(ligne);
  }

  getMODescription(ligne: any): string {
    return ligne?.nom || ligne?.descriptionMainDoeuvre || ligne?.description || ligne?.mainDoeuvre?.description || ligne?.mainDoeuvre?.categorie?.nom || 'Prestation main-d’œuvre';
  }

  getMOCategorie(ligne: any): string {
    return ligne?.mainDoeuvre?.categorie?.nom || '';
  }

  getMOHeures(ligne: any): number {
    return Number(ligne?.nbreHeure ?? ligne?.heures ?? ligne?.quantite ?? 0);
  }

  getMOTarifHoraire(ligne: any): number {
    if (ligne?.tarifHoraire != null && Number(ligne.tarifHoraire) > 0) return Number(ligne.tarifHoraire);
    if (ligne?.prix != null && Number(ligne.prix) > 0) return Number(ligne.prix);
    if (ligne?.prixUnitaire != null && Number(ligne.prixUnitaire) > 0) return Number(ligne.prixUnitaire);
    if (ligne?.mainDoeuvre?.prix != null && Number(ligne.mainDoeuvre.prix) > 0) return Number(ligne.mainDoeuvre.prix);
    return 0;
  }

  getMOTotal(ligne: any): number {
    if (ligne?.montantTotal != null && ligne?.montantTotal !== 0) return Number(ligne.montantTotal);
    if (ligne?.total != null && ligne?.total !== 0) return Number(ligne.total);
    return this.getMOTarifHoraire(ligne) * this.getMOHeures(ligne);
  }

  get totalPiecesEstime(): number {
    return this.lignesPiecesAffichees.reduce((acc, l) => acc + this.getPieceTotal(l), 0);
  }

  get totalMOEstime(): number {
    return this.lignesMainDoeuvreAffichees.reduce((acc, l) => acc + this.getMOTotal(l), 0);
  }

  get totalHTCalcule(): number {
    if (this.proformaChargee?.montantHT != null && this.proformaChargee.montantHT > 0) {
      return this.proformaChargee.montantHT;
    }
    return this.totalPiecesEstime + this.totalMOEstime;
  }

  get tvaTaux(): number {
    return this.proformaChargee?.tva ?? 18;
  }

  get totalTVACalcule(): number {
    if (this.proformaChargee?.montantTVA != null && this.proformaChargee.montantTVA > 0) {
      return this.proformaChargee.montantTVA;
    }
    return Math.round(this.totalHTCalcule * (this.tvaTaux / 100));
  }

  get totalTTCCalcule(): number {
    if (this.proformaChargee?.montantTTC != null && this.proformaChargee.montantTTC > 0) {
      return this.proformaChargee.montantTTC;
    }
    return this.totalHTCalcule + this.totalTVACalcule;
  }

  get isProformaValide(): boolean {
    if (!this.proformaChargee) return false;
    const s = (this.proformaChargee.statut || '').toUpperCase();
    const isProformaStatusValide = ['ACCEPTE', 'ACCEPTEE', 'VALIDE', 'VALIDEE', 'VALIDEE_CLIENT', 'APPROUVE', 'APPROUVEE'].includes(s);
    const isOrdrePastProforma = !!(this.loadedOrdre?.statut && !['RECEPTION', 'A_FAIRE', 'DIAGNOSTIC', 'EN_DIAGNOSTIC', 'PIECES_MO', 'EN_ATTENTE_PIECES_MO', 'PROFORMA', 'EN_ATTENTE_PROFORMA'].includes(this.loadedOrdre.statut));
    return isProformaStatusValide || isOrdrePastProforma;
  }

  get isProformaVisibleClient(): boolean {
    return this.proformaChargee?.visibleClient === true;
  }

  envoyerAuClient(): void {
    this.openModalEnvoi();
  }

  openModalEnvoi(): void {
    if (!this.proformaChargee?.id || this.isProformaVisibleClient) return;
    this.showModalEnvoi = true;
    this.cdr.detectChanges();
  }

  closeModalEnvoi(): void {
    this.showModalEnvoi = false;
    this.envoiEnCours = false;
    this.cdr.detectChanges();
  }

  confirmerEnvoiAuClient(): void {
    if (!this.proformaChargee?.id || this.envoiEnCours) return;

    // Fermer le modal immédiatement
    this.showModalEnvoi = false;
    this.envoiEnCours = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.proformaService.validerEnvoi(this.proformaChargee.id).subscribe({
      next: (updated) => {
        this.envoiEnCours = false;
        if (this.proformaChargee) {
          this.proformaChargee.visibleClient = true;
        }
        this.successMessage = 'Proforma envoyée avec succès : elle est maintenant visible dans l’espace client.';
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.envoiEnCours = false;
        if (err.status === 200 || err.status === 201) {
          if (this.proformaChargee) {
            this.proformaChargee.visibleClient = true;
          }
          this.successMessage = 'Proforma envoyée avec succès : elle est maintenant visible dans l’espace client.';
          this.loadData();
        } else {
          this.errorMessage = err.error?.message || err.message || 'Impossible d’envoyer la proforma au client.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  validerProforma(): void {
    this.openModalValider();
  }

  openModalValider(): void {
    if (!this.proformaChargee?.id) {
      this.errorMessage = 'Aucune proforma chargée à valider.';
      this.cdr.detectChanges();
      return;
    }
    this.showModalValider = true;
    this.cdr.detectChanges();
  }

  closeModalValider(): void {
    this.showModalValider = false;
    this.validationEnCours = false;
    this.cdr.detectChanges();
  }

  confirmerValidationProforma(): void {
    if (!this.proformaChargee?.id || this.validationEnCours) return;

    // Fermer le modal immédiatement
    this.showModalValider = false;
    this.validationEnCours = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.proformaService.valider(this.proformaChargee.id).subscribe({
      next: (res: any) => {
        this.validationEnCours = false;
        if (this.proformaChargee) {
          this.proformaChargee.statut = res?.statut || 'ACCEPTE';
        }
        this.successMessage = 'Devis proforma validé avec succès.';
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.validationEnCours = false;
        if (err.status === 200 || err.status === 201) {
          if (this.proformaChargee) {
            this.proformaChargee.statut = 'ACCEPTE';
          }
          this.successMessage = 'Devis proforma validé avec succès.';
          this.loadData();
        } else {
          this.errorMessage = err.error?.message || err.message || 'Erreur lors de la validation du proforma.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  passerEtapeSuivante(): void {
    if (!this.isProformaValide) {
      this.errorMessage = 'Veuillez d\'abord valider le devis proforma pour continuer.';
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const hasRupture = this.lignesPiecesAffichees.some((l: any) => {
      if (l.isCustom) return false;
      const dispo = (l.piece?.stockMagasin ?? 0) + (l.piece?.stockAtelier ?? 0);
      return (l.quantite ?? 0) > dispo;
    });

    const nextStatut = hasRupture ? 'BON_DE_COMMANDE' : 'BON_DE_SORTIE';
    this.ordreService.updateStatut(this.ordreId, nextStatut).subscribe({
      next: () => {
        this.saving = false;
        this.cdr.markForCheck();

        if (hasRupture) {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'approvisionnement']);
        } else {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
        }
      },
      error: (err) => {
        this.saving = false;
        // Si le statut est déjà synchronisé côté backend, on autorise la navigation
        if (hasRupture) {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'approvisionnement']);
        } else {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
        }
      }
    });
  }

  validateStep(): void {
    this.passerEtapeSuivante();
  }

  telechargerPdf(): void {
    if (!this.proformaChargee?.id) return;
    this.telechargementEnCours = true;
    this.proformaService.downloadPdf(this.proformaChargee.id).subscribe({
      next: (blob) => {
        this.telechargementEnCours = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proforma-${this.proformaChargee.numero || this.proformaChargee.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.markForCheck();
      },
      error: () => {
        this.telechargementEnCours = false;
        this.errorMessage = 'Impossible de télécharger le PDF du proforma.';
        this.cdr.markForCheck();
      }
    });
  }

  showConfirmOTModal = false;

  ouvrirConfirmationOT(): void {
    if (!this.isProformaValide) {
      this.errorMessage = 'Veuillez d\'abord valider la facture proforma pour créer un ordre de travail.';
      return;
    }
    this.showConfirmOTModal = true;
    this.cdr.markForCheck();
  }

  fermerConfirmationOT(): void {
    this.showConfirmOTModal = false;
    this.cdr.markForCheck();
  }

  confirmerCreationOT(): void {
    this.showConfirmOTModal = false;
    this.creationOTEnCours = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.otService.createFromOrdreReparation(this.ordreId).subscribe({
      next: (ot) => {
        this.creationOTEnCours = false;
        this.existingOT = ot;
        this.successMessage = `Ordre de Travail ${ot.numero} créé avec succès. Redirection vers l'atelier...`;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-travail', ot.id]);
        }, 600);
      },
      error: (err) => {
        this.creationOTEnCours = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la création de l\'ordre de travail.';
        this.cdr.markForCheck();
      }
    });
  }
}
