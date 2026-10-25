import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { ProformaService } from '../../../../proforma/proforma.service';
import { FiscalConfigurationService } from '../../../../gestion-tva/fiscal-configuration.service';
import { OrdreTravailService } from '../../../../ordres-travail/ordre-travail.service';
import { OrdreTravail, getEtapeFromStatutOT, getPathFromEtapeOT } from '../../../../ordres-travail/models/ordre-travail.model';

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
  downloadLayoutKey: 'AVEC_ENTETE' | 'SANS_ENTETE' = 'AVEC_ENTETE';

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

  getPieceTauxRemise(ligne: any): number {
    return Math.max(0, Math.min(100, Number(ligne?.tauxRemise) || 0));
  }

  getPiecePrixUnitaire(ligne: any): number {
    if (ligne?.prix != null && Number(ligne.prix) > 0) return Number(ligne.prix);
    if (ligne?.prixUnitaire != null && Number(ligne.prixUnitaire) > 0) return Number(ligne.prixUnitaire);
    if (ligne?.piece?.prix != null && Number(ligne.piece.prix) > 0) return Number(ligne.piece.prix);
    return 0;
  }

  getPieceTotalBrut(ligne: any): number {
    const prix = this.getPiecePrixUnitaire(ligne);
    if (prix > 0) return prix * this.getPieceQuantite(ligne);

    // Les DTO proforma exposent montantTotal après remise. Reconstituer le brut
    // seulement si le tarif unitaire n'est pas disponible.
    const net = Number(ligne?.montantTotal ?? ligne?.total);
    const taux = this.getPieceTauxRemise(ligne);
    if (Number.isFinite(net) && net >= 0) return taux < 100 ? net / (1 - taux / 100) : net;
    return 0;
  }

  getPieceMontantRemise(ligne: any): number {
    const net = ligne?.montantTotal ?? ligne?.total;
    if (net != null) return Math.max(0, this.getPieceTotalBrut(ligne) - Number(net));
    return this.getPieceTotalBrut(ligne) * this.getPieceTauxRemise(ligne) / 100;
  }

  getPieceTotal(ligne: any): number {
    const net = ligne?.montantTotal ?? ligne?.total;
    if (net != null && Number.isFinite(Number(net))) return Number(net);
    return this.getPieceTotalBrut(ligne) - this.getPieceMontantRemise(ligne);
  }

  getPiecePrixUnitaireNet(ligne: any): number {
    return this.getPiecePrixUnitaire(ligne) * (1 - this.getPieceTauxRemise(ligne) / 100);
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
    const net = ligne?.montantTotal ?? ligne?.total;
    if (net != null && Number.isFinite(Number(net))) return Number(net);
    return this.getMOTotalBrut(ligne) - this.getMOMontantRemise(ligne);
  }

  getMOTauxRemise(ligne: any): number {
    return Math.max(0, Math.min(100, Number(ligne?.tauxRemise) || 0));
  }

  getMOMontantRemise(ligne: any): number {
    const net = ligne?.montantTotal ?? ligne?.total;
    if (net != null) return Math.max(0, this.getMOTotalBrut(ligne) - Number(net));
    return this.getMOTotalBrut(ligne) * this.getMOTauxRemise(ligne) / 100;
  }

  getMOTotalBrut(ligne: any): number {
    const tarif = this.getMOTarifHoraire(ligne);
    if (tarif > 0) return tarif * this.getMOHeures(ligne);
    const net = Number(ligne?.montantTotal ?? ligne?.total);
    const taux = this.getMOTauxRemise(ligne);
    if (Number.isFinite(net) && net >= 0) return taux < 100 ? net / (1 - taux / 100) : net;
    return 0;
  }

  getMOTarifHoraireNet(ligne: any): number {
    return this.getMOTarifHoraire(ligne) * (1 - this.getMOTauxRemise(ligne) / 100);
  }

  get tauxRemiseClient(): number {
    return Math.max(0, Math.min(100, Number(this.proformaChargee?.tauxRemiseClient) || 0));
  }

  get montantRemiseGenerale(): number {
    return this.lignesPiecesAffichees.reduce((sum, ligne) => sum + this.getPieceMontantRemise(ligne), 0)
      + this.lignesMainDoeuvreAffichees.reduce((sum, ligne) => sum + this.getMOMontantRemise(ligne), 0);
  }

  get totalApresRemiseCompteClient(): number {
    const montantRemiseClient = this.proformaChargee?.montantRemiseClient != null
      ? Number(this.proformaChargee.montantRemiseClient) || 0
      : this.totalPiecesEstime * this.tauxRemiseClient / 100;
    return this.totalPiecesEstime - montantRemiseClient + this.totalMOEstime;
  }

  get totalPiecesEstime(): number {
    return this.lignesPiecesAffichees.reduce((acc, l) => acc + this.getPieceTotal(l), 0);
  }

  get totalMOEstime(): number {
    return this.lignesMainDoeuvreAffichees.reduce((acc, l) => acc + this.getMOTotalBrut(l) - this.getMOMontantRemise(l), 0);
  }

  get totalHTCalcule(): number {
    if (this.proformaChargee?.montantHT != null && this.proformaChargee.montantHT > 0) {
      return this.proformaChargee.montantHT;
    }
    return this.totalApresRemiseCompteClient;
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
    if (this.proformaChargee?.montantTotal != null && this.proformaChargee.montantTotal > 0) {
      return this.proformaChargee.montantTotal;
    }
    if (this.proformaChargee?.montantTTC != null && this.proformaChargee.montantTTC > 0) {
      return this.proformaChargee.montantTTC + (Number(this.proformaChargee.montantTimbre) || 0);
    }
    return this.totalHTCalcule + this.totalTVACalcule + (Number(this.proformaChargee?.montantTimbre) || 0);
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

    this.ordreService.updateStatut(this.ordreId, 'ORDRE_DE_TRAVAIL').subscribe({
      next: () => {
        this.saving = false;
        this.cdr.markForCheck();
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'ordre-travail']);
      },
      error: () => {
        this.saving = false;
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'ordre-travail']);
      }
    });
  }

  validateStep(): void {
    this.passerEtapeSuivante();
  }

  telechargerPdf(layoutKey: 'AVEC_ENTETE' | 'SANS_ENTETE' = this.downloadLayoutKey): void {
    if (!this.proformaChargee?.id) return;
    this.telechargementEnCours = true;
    this.proformaService.downloadPdf(this.proformaChargee.id, layoutKey).subscribe({
      next: (blob) => {
        this.telechargementEnCours = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proforma-${this.proformaChargee.numero || this.proformaChargee.id}-${layoutKey === 'AVEC_ENTETE' ? 'avec-entete' : 'sans-entete'}.pdf`;
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

  getOtPath(ot: any): string {
    if (!ot) return 'recapitulatif';
    const etape = ot.etape || getEtapeFromStatutOT(ot.statut);
    return getPathFromEtapeOT(etape);
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
          const path = this.getOtPath(ot);
          this.router.navigate(['/app/ordres-travail', ot.id, path]);
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
