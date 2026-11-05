import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  extractContent,
  getEtapeFromStatut
} from '../../../../../shared/models';
import { StepProformaResponseDto } from '../../../models/responses';

@Component({
  selector: 'app-step-proforma',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, RouterLink],
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
  destinataireWhatsapp = '';
  destinataireEmail = '';

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
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des données.';
        this.cdr.markForCheck();
      }
    });
  }

  get isPassedToOT(): boolean {
    return getEtapeFromStatut(this.loadedOrdre?.statut) >= 5 || !!this.existingOT;
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

  get montantRemiseClientCalcule(): number {
    if (this.proformaChargee?.montantRemiseClient != null) {
      return Number(this.proformaChargee.montantRemiseClient) || 0;
    }
    return this.totalPiecesEstime * this.tauxRemiseClient / 100;
  }

  get totalPiecesNet(): number {
    return Math.max(0, this.totalPiecesEstime - this.montantRemiseClientCalcule);
  }

  get totalApresRemiseCompteClient(): number {
    return this.totalPiecesNet + this.totalMOEstime;
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
    if (this.proformaChargee?.tvaApplicable === false) return 0;
    if (this.proformaChargee?.montantTVA != null && this.proformaChargee.montantTVA > 0) {
      return this.proformaChargee.montantTVA;
    }
    if (this.proformaChargee?.tvaApplicable === true) return Math.round(this.totalHTCalcule * (this.tvaTaux / 100));
    return this.proformaChargee?.montantTVA ?? 0;
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
    return ['ACCEPTE', 'ACCEPTEE', 'VALIDE', 'VALIDEE', 'VALIDEE_CLIENT', 'APPROUVE', 'APPROUVEE'].includes(s);
  }

  get proformaModifiable(): boolean {
    const statut = (this.proformaChargee?.statut || '').toUpperCase();
    return !!this.proformaChargee?.id && !['CONVERTIE', 'PAYEE', 'PARTIELLEMENT_PAYEE'].includes(statut);
  }

  modifierProforma(): void {
    if (!this.proformaModifiable || !this.proformaChargee?.id) return;
    const returnTo = `/app/ordres-reparation/${this.ordreId}/proforma`;
    this.router.navigate(['/app/proformas'], {
      queryParams: { openId: this.proformaChargee.id, returnTo }
    });
  }

  get isProformaVisibleClient(): boolean {
    return this.proformaChargee?.visibleClient === true;
  }

  get clientNom(): string {
    if (this.proformaChargee?.clientNom) return this.proformaChargee.clientNom;
    const c = this.loadedOrdre?.vehicule?.client;
    if (c) return `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Client';
    return 'Client';
  }

  envoyerAuClient(): void {
    this.openModalEnvoi();
  }

  clicBoutonWhatsapp(): void {
    if (!this.destinataireWhatsapp) {
      this.destinataireWhatsapp = this.loadedOrdre?.vehicule?.client?.phone || (this.proformaChargee as any)?.clientTelephone || '';
    }
    if (!this.destinataireWhatsapp) {
      this.openModalEnvoi();
      this.errorMessage = "Veuillez renseigner le numéro WhatsApp du client.";
      this.cdr.detectChanges();
      return;
    }
    this.envoyerParWhatsapp();
  }

  clicBoutonEmail(): void {
    if (!this.destinataireEmail) {
      this.destinataireEmail = (this.loadedOrdre?.vehicule?.client as any)?.email || (this.proformaChargee as any)?.clientEmail || '';
    }
    if (!this.destinataireEmail) {
      this.openModalEnvoi();
      this.errorMessage = "Veuillez renseigner l'adresse email du client.";
      this.cdr.detectChanges();
      return;
    }
    this.envoyerParEmail();
  }

  openModalEnvoi(): void {
    if (!this.proformaChargee?.id) return;
    this.destinataireWhatsapp = this.loadedOrdre?.vehicule?.client?.phone || (this.proformaChargee as any)?.clientTelephone || '';
    this.destinataireEmail = (this.loadedOrdre?.vehicule?.client as any)?.email || (this.proformaChargee as any)?.clientEmail || '';
    this.showModalEnvoi = true;
    this.cdr.detectChanges();
  }

  closeModalEnvoi(): void {
    this.showModalEnvoi = false;
    this.envoiEnCours = false;
    this.cdr.detectChanges();
  }

  envoyerParWhatsapp(): void {
    if (!this.proformaChargee?.id) return;
    const rawPhone = (this.destinataireWhatsapp || '').trim();
    if (!rawPhone) {
      this.errorMessage = "Veuillez renseigner un numéro de téléphone pour l'envoi WhatsApp.";
      this.cdr.detectChanges();
      return;
    }

    let cleanPhone = rawPhone.replace(/[\s\+\-\(\)]/g, '');
    if (cleanPhone.length === 9 && /^[7][05678]/.test(cleanPhone)) {
      cleanPhone = '221' + cleanPhone;
    }

    const vehiculeInfo = [
      this.loadedOrdre?.vehicule?.marque,
      this.loadedOrdre?.vehicule?.modele,
      this.loadedOrdre?.vehicule?.immatriculation ? `(${this.loadedOrdre?.vehicule?.immatriculation})` : ''
    ].filter(Boolean).join(' ');

    const montantTtcStr = new Intl.NumberFormat('fr-FR').format(this.totalTTCCalcule);

    const message = `Bonjour ${this.clientNom},\n\nVotre devis proforma N° *${this.proformaChargee.numero || 'N/A'}* pour le véhicule *${vehiculeInfo || 'votre véhicule'}* est prêt chez *Orient Auto Service*.\n\n💰 *Montant Total TTC :* ${montantTtcStr} FCFA\n\nMerci de bien vouloir nous confirmer votre accord pour engager les travaux.\n\nCordialement,\n*Orient Auto Service*`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    this.confirmerEnvoiAuClient('WhatsApp');
  }

  envoyerParEmail(): void {
    if (!this.proformaChargee?.id) return;
    const email = (this.destinataireEmail || '').trim();
    if (!email) {
      this.errorMessage = "Veuillez renseigner une adresse email pour l'envoi.";
      this.cdr.detectChanges();
      return;
    }

    const vehiculeInfo = [
      this.loadedOrdre?.vehicule?.marque,
      this.loadedOrdre?.vehicule?.modele,
      this.loadedOrdre?.vehicule?.immatriculation ? `(${this.loadedOrdre?.vehicule?.immatriculation})` : ''
    ].filter(Boolean).join(' ');

    const montantHtStr = new Intl.NumberFormat('fr-FR').format(this.proformaChargee.montantHT || this.totalHTCalcule);
    const montantTvaStr = new Intl.NumberFormat('fr-FR').format(this.proformaChargee.montantTVA || this.totalTVACalcule);
    const montantTtcStr = new Intl.NumberFormat('fr-FR').format(this.totalTTCCalcule);

    const subject = `Orient Auto Service - Devis Proforma ${this.proformaChargee.numero || ''} - ${this.loadedOrdre?.vehicule?.immatriculation || ''}`;

    const body = `Bonjour ${this.clientNom},

Veuillez trouver ci-dessous le récapitulatif de votre devis proforma N° ${this.proformaChargee.numero || 'N/A'} concernant votre véhicule ${vehiculeInfo} :

- Montant Total Net HT : ${montantHtStr} FCFA
- TVA : ${montantTvaStr} FCFA
- Net à Payer (TTC) : ${montantTtcStr} FCFA

Vous pouvez également consulter votre devis directement depuis votre espace client.
Merci de bien vouloir nous donner votre accord pour le démarrage des travaux.

Cordialement,
Orient Auto Service`;

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_self');

    this.confirmerEnvoiAuClient('Email');
  }

  confirmerEnvoiAuClient(canal: string = 'Portail'): void {
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
        this.successMessage = `Proforma transmise avec succès au client (Canal : ${canal}).`;
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.envoiEnCours = false;
        if (err.status === 200 || err.status === 201) {
          if (this.proformaChargee) {
            this.proformaChargee.visibleClient = true;
          }
          this.successMessage = `Proforma transmise avec succès au client (Canal : ${canal}).`;
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
        if (this.proformaChargee) {
          this.proformaChargee.statut = res?.statut || 'ACCEPTE';
        }
        this.successMessage = 'Devis proforma validé avec succès. Création de l\'ordre de travail...';
        this.cdr.detectChanges();
        this.creerOTEtOuvrir();
      },
      error: (err) => {
        if (err.status === 200 || err.status === 201) {
          if (this.proformaChargee) {
            this.proformaChargee.statut = 'ACCEPTE';
          }
          this.successMessage = 'Devis proforma validé avec succès. Création de l\'ordre de travail...';
          this.cdr.detectChanges();
          this.creerOTEtOuvrir();
        } else {
          this.validationEnCours = false;
          this.errorMessage = err.error?.message || err.message || 'Erreur lors de la validation du proforma.';
          this.cdr.detectChanges();
        }
      }
    });
  }

  /**
   * Après validation du proforma : crée l'Ordre de Travail (ou récupère celui qui existe déjà)
   * puis l'ouvre directement.
   */
  private creerOTEtOuvrir(): void {
    const ouvrir = (ot: OrdreTravail) => {
      this.validationEnCours = false;
      this.creationOTEnCours = false;
      this.existingOT = ot;
      this.ordreService.updateStatut(this.ordreId, 'ORDRE_DE_TRAVAIL').subscribe({ next: () => {}, error: () => {} });
      this.successMessage = `Ordre de Travail ${ot.numero} prêt. Ouverture...`;
      this.cdr.markForCheck();
      this.router.navigate(['/app/ordres-travail', ot.id, this.getOtPath(ot)]);
    };

    if (this.existingOT) {
      ouvrir(this.existingOT);
      return;
    }

    this.creationOTEnCours = true;
    this.otService.createFromOrdreReparation(this.ordreId).subscribe({
      next: (ot) => ouvrir(ot),
      error: (err) => {
        // L'OT existe peut-être déjà : on redirige vers l'étape Ordre de Travail de l'OR
        this.ordreService.getStepOrdreTravail(this.ordreId).subscribe({
          next: (stepOt) => {
            const otId = stepOt?.ordreTravailId || stepOt?.ordreTravail?.id;
            if (otId) {
              this.validationEnCours = false;
              this.creationOTEnCours = false;
              this.ordreService.updateStatut(this.ordreId, 'ORDRE_DE_TRAVAIL').subscribe({ next: () => {}, error: () => {} });
              this.router.navigate(['/app/ordres-travail', otId, 'recapitulatif']);
            } else {
              this.validationEnCours = false;
              this.creationOTEnCours = false;
              this.errorMessage = err.error?.message || 'Proforma validé, mais la création de l\'ordre de travail a échoué.';
              this.loadData();
              this.cdr.markForCheck();
            }
          },
          error: () => {
            this.validationEnCours = false;
            this.creationOTEnCours = false;
            this.errorMessage = err.error?.message || 'Proforma validé, mais la création de l\'ordre de travail a échoué.';
            this.loadData();
            this.cdr.markForCheck();
          }
        });
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
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Impossible de passer à l’Ordre de Travail. Vérifiez que le proforma est validé.';
        this.cdr.markForCheck();
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
        this.ordreService.updateStatut(this.ordreId, 'ORDRE_DE_TRAVAIL').subscribe({ next: () => {}, error: () => {} });
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
