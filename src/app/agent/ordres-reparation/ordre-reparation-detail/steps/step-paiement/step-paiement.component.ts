import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { StepPaiementResponseDto } from '../../../models/responses/step-paiement-response.dto';
import { LignePieceBLDto, LigneMainDoeuvreBLDto, NoteDePrixSummaryDto } from '../../../models/responses/step-bl-response.dto';
import { FactureService } from '../../../../factures/facture.service';
import { RecuService } from '../../../../gestion-recu/recu.service';
import { BonDeLivraisonService, BonDeLivraisonOrdreContext } from '../../../../bons-livraison/bon-de-livraison.service';
import { NoteDePrixService } from '../../../../notes-prix/note-de-prix.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { FACTURE_MODES_PAIEMENT, FactureModePaiement, modePaiementRecu, isModeHt } from '../../../../factures/models/facture-mode-paiement';

@Component({
  selector: 'app-step-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent, DecimalPipe, DatePipe],
  templateUrl: './step-paiement.component.html'
})
export class StepPaiementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private factureService = inject(FactureService);
  private recuService = inject(RecuService);
  private bonDeLivraisonService = inject(BonDeLivraisonService);
  private noteDePrixService = inject(NoteDePrixService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  selectedFilter: 'TOUS' | 'PDP' | 'PDG' | 'PDS' | 'MO' = 'TOUS';

  get lignesPieces(): LignePieceBLDto[] {
    return this.data?.lignesPieces || [];
  }

  get lignesMainDoeuvres(): LigneMainDoeuvreBLDto[] {
    return this.data?.lignesMainDoeuvres || [];
  }

  getPieceType(p: LignePieceBLDto): 'PDP' | 'PDG' | 'PDS' | string {
    if (p.type) return p.type.toUpperCase();
    if (p.isCustom) return 'PDS';
    return 'PDP';
  }

  getPieceDesignation(p: LignePieceBLDto): string {
    return p.designationPiece || p.designationPds || 'Pièce';
  }

  get lignesPDP(): LignePieceBLDto[] {
    return this.lignesPieces.filter(p => this.getPieceType(p) === 'PDP');
  }

  get lignesPDG(): LignePieceBLDto[] {
    return this.lignesPieces.filter(p => this.getPieceType(p) === 'PDG');
  }

  get lignesPDS(): LignePieceBLDto[] {
    return this.lignesPieces.filter(p => this.getPieceType(p) === 'PDS');
  }

  get piecesFiltrees(): LignePieceBLDto[] {
    if (this.selectedFilter === 'PDP') return this.lignesPDP;
    if (this.selectedFilter === 'PDG') return this.lignesPDG;
    if (this.selectedFilter === 'PDS') return this.lignesPDS;
    if (this.selectedFilter === 'MO') return [];
    return this.lignesPieces;
  }

  get moFiltrees(): LigneMainDoeuvreBLDto[] {
    if (this.selectedFilter === 'PDP' || this.selectedFilter === 'PDG' || this.selectedFilter === 'PDS') return [];
    return this.lignesMainDoeuvres;
  }

  get totalArticlesCount(): number {
    return this.lignesPieces.length + this.lignesMainDoeuvres.length;
  }

  get totalPiecesHT(): number {
    return this.lignesPieces.reduce((sum, p) => sum + (p.montantTotal ?? ((p.prix || 0) * (p.quantite || 0) * (1 - (p.tauxRemise || 0) / 100))), 0);
  }

  get totalMOHT(): number {
    return this.lignesMainDoeuvres.reduce((sum, m) => sum + (m.montantTotal ?? ((m.tarifHoraire || 0) * (m.nbreHeure || 0) * (1 - (m.tauxRemise || 0) / 100))), 0);
  }

  get totalCalculatedHT(): number {
    return (this.data?.montantHT && this.data.montantHT > 0) ? this.data.montantHT : (this.totalPiecesHT + this.totalMOHT);
  }

  setFilter(filter: 'TOUS' | 'PDP' | 'PDG' | 'PDS' | 'MO'): void {
    this.selectedFilter = filter;
    this.cdr.markForCheck();
  }

  get payTotalEncaisse(): number { return Number(this.payMontant) || 0; }

  ordreId!: number;
  data: StepPaiementResponseDto | null = null;
  contexteOrdre: BonDeLivraisonOrdreContext | null = null;
  createdFacture: any = null;
  createdNoteDePrix: any = null;

  loading = true;
  advancing = false;
  creatingFacture = false;
  convertingNote = false;
  paying = false;

  showCreateFactureModal = false;
  showConfirmNoteModal = false;
  remarqueFacture = '';
  modePaiementFacture: FactureModePaiement = 'ESPECE_TTC';
  readonly modesPaiementFacture = FACTURE_MODES_PAIEMENT;

  modePaiementNote: FactureModePaiement = 'ESPECE_TTC';
  remarqueNote = '';
  readonly isModeHt = isModeHt;

  showPayModal = false;
  payMontant = 0;
  payMethode = 'ESPECE';
  showPayNoteModal = false;
  payingNote = false;
  payNoteMontant = 0;
  payNoteMethode = 'ESPECE';

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-reparation']);
      return;
    }
    this.ordreId = +idParam;
    const navigationState = this.router.getCurrentNavigation()?.extras.state as { conversionMessage?: string } | undefined;
    this.successMessage = navigationState?.conversionMessage || '';
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.ordreService.getStepPaiement(this.ordreId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.data = res;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Erreur lors du chargement de la facturation.';
          this.cdr.detectChanges();
        });
      }
    });

    this.bonDeLivraisonService.getContexteOrdre(this.ordreId).subscribe({
      next: (ctx) => {
        this.ngZone.run(() => {
          this.contexteOrdre = ctx;
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }

  get bonDeLivraisonNumero(): string | null {
    return this.data?.bonDeLivraison?.numero || this.contexteOrdre?.bonDeLivraison?.numero || null;
  }

  get factureCourante(): any {
    return this.data?.facture || this.createdFacture || null;
  }

  hasFacture(): boolean {
    return !!(this.data?.facture?.id || this.createdFacture?.id || this.data?.bonDeLivraison?.factureId || this.contexteOrdre?.bonDeLivraison?.factureId);
  }

  isFacturePayee(): boolean {
    const facture = this.factureCourante;
    if (!facture) return false;
    const s = (facture.statut || '').toUpperCase();
    const restant = facture.montantRestant;
    return s === 'PAYE' && restant != null && Number.isFinite(restant) && restant <= 0;
  }

  statutPaiementLabel(statut?: string | null): string {
    switch ((statut || '').toUpperCase()) {
      case 'PAYE': return 'RÈGLEMENT CONFIRMÉ';
      case 'PARTIEL': return 'PAIEMENT PARTIEL';
      default: return 'NON PAYÉ';
    }
  }

  statutPaiementClass(statut?: string | null): string {
    switch ((statut || '').toUpperCase()) {
      case 'PAYE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PARTIEL': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  }

  hasNoteDePrix(): boolean {
    return !this.hasFacture() && !!(
      this.data?.noteDePrix?.id ||
      this.createdNoteDePrix?.id ||
      this.data?.bonDeLivraison?.noteDePrixId ||
      this.contexteOrdre?.bonDeLivraison?.noteDePrixId
    );
  }

  get noteDePrixInfo(): NoteDePrixSummaryDto | null {
    if (this.data?.noteDePrix?.id) return this.data.noteDePrix;
    if (this.createdNoteDePrix?.id) return this.createdNoteDePrix;
    const bl = this.data?.bonDeLivraison || this.contexteOrdre?.bonDeLivraison;
    if (bl?.noteDePrixId) {
      return {
        id: bl.noteDePrixId,
        numero: bl.noteDePrixNumero || ('NP-' + bl.noteDePrixId),
        montantTotal: this.data?.montantTotal || this.totalCalculatedHT,
        montantPaye: 0,
        resteAPayer: this.data?.montantTotal || this.totalCalculatedHT,
        statut: 'GENEREE',
        statutPaiement: 'NON_PAYE',
        tvaApplicable: this.data?.tvaApplicable,
        client: this.data?.clientNom,
        vehicule: this.data?.immatriculation
      };
    }
    return null;
  }

  private async getOrCreateBonDeLivraisonId(): Promise<number> {
    if (this.data?.bonDeLivraison?.id) {
      return this.data.bonDeLivraison.id;
    }
    if (this.contexteOrdre?.bonDeLivraison?.id) {
      return this.contexteOrdre.bonDeLivraison.id;
    }
    try {
      const ctx = await firstValueFrom(this.bonDeLivraisonService.getContexteOrdre(this.ordreId));
      if (ctx) {
        this.contexteOrdre = ctx;
        if (ctx.bonDeLivraison?.id) {
          return ctx.bonDeLivraison.id;
        }
      }
    } catch {
      // Ignorer l'erreur et tenter la création
    }

    try {
      const createdBL = await firstValueFrom(this.bonDeLivraisonService.create({
        ordreReparationId: this.ordreId,
        appliquerTVA: this.data?.tvaApplicable ?? true,
        remarque: `Bon de livraison pour OR ${this.data?.numero || ('#' + this.ordreId)}`
      }));
      return createdBL.id;
    } catch (createErr) {
      const retryCtx = await firstValueFrom(this.bonDeLivraisonService.getContexteOrdre(this.ordreId));
      if (retryCtx?.bonDeLivraison?.id) {
        this.contexteOrdre = retryCtx;
        return retryCtx.bonDeLivraison.id;
      }
      throw createErr;
    }
  }

  // --- Modal Création Facture ---

  ouvrirModalCreationFacture(): void {
    this.showCreateFactureModal = true;
    this.modePaiementFacture = this.data?.tvaApplicable === false ? 'ESPECE_HT' : 'ESPECE_TTC';
    this.remarqueFacture = `Facture pour Ordre de Réparation ${this.data?.numero || ('#' + this.ordreId)}`;
    this.cdr.detectChanges();
  }

  fermerModalCreationFacture(): void {
    if (this.creatingFacture) return;
    this.showCreateFactureModal = false;
    this.cdr.detectChanges();
  }

  async creerFacture(): Promise<void> {
    if (!this.data) return;
    if (!this.data.clientId || !this.data.vehiculeId) {
      this.errorMessage = 'Le client et le véhicule de cet ordre de réparation sont obligatoires pour créer la facture.';
      this.cdr.detectChanges();
      return;
    }

    this.creatingFacture = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    try {
      const blId = await this.getOrCreateBonDeLivraisonId();
      this.bonDeLivraisonService.convertirFacture(blId, {
        modePaiement: this.modePaiementFacture,
        remarque: this.remarqueFacture.trim() || `Facture pour OR ${this.data.numero || ('#' + this.ordreId)}`
      }).subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            this.creatingFacture = false;
            this.showCreateFactureModal = false;
            this.createdFacture = res;
            this.successMessage = `Facture ${res?.numero || ''} créée. Vous pouvez enregistrer le règlement sur cet ordre.`.trim();
            void this.router.navigate(['/app/ordres-reparation', this.ordreId, 'facturation']);
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.creatingFacture = false;
            this.errorMessage = err.error?.message || err.message || 'Erreur lors de la création de la facture.';
            this.cdr.detectChanges();
          });
        }
      });
    } catch (err: any) {
      this.ngZone.run(() => {
        this.creatingFacture = false;
        this.errorMessage = err.error?.message || err.message || 'Impossible d\'obtenir ou créer le bon de livraison pour la facture.';
        this.cdr.detectChanges();
      });
    }
  }

  // --- Modal Conversion Note de Prix ---

  ouvrirModalConfirmationNote(): void {
    this.modePaiementNote = this.data?.tvaApplicable === false ? 'ESPECE_HT' : 'ESPECE_TTC';
    this.remarqueNote = '';
    this.showConfirmNoteModal = true;
    this.cdr.detectChanges();
  }

  fermerModalConfirmationNote(): void {
    if (this.convertingNote) return;
    this.showConfirmNoteModal = false;
    this.cdr.detectChanges();
  }

  async convertirEnNoteDePrix(): Promise<void> {
    if (this.convertingNote) return;
    this.convertingNote = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    try {
      const blId = await this.getOrCreateBonDeLivraisonId();
      this.bonDeLivraisonService.convertirNote(blId, {
        modePaiement: this.modePaiementNote,
        remarque: this.remarqueNote
      }).subscribe({
        next: (res) => {
          this.ngZone.run(() => {
            this.convertingNote = false;
            this.showConfirmNoteModal = false;
            this.createdNoteDePrix = res;
            this.successMessage = `Note de prix ${res?.numero || ''} créée. Vous pouvez suivre son règlement sur cet ordre.`.trim();
            void this.router.navigate(['/app/ordres-reparation', this.ordreId, 'facturation']);
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            this.convertingNote = false;
            this.errorMessage = err.error?.message || err.message || 'Erreur lors de la conversion en note de prix.';
            this.cdr.detectChanges();
          });
        }
      });
    } catch (err: any) {
      this.ngZone.run(() => {
        this.convertingNote = false;
        this.errorMessage = err.error?.message || err.message || 'Impossible d\'obtenir ou créer le bon de livraison pour la note de prix.';
        this.cdr.detectChanges();
      });
    }
  }

  // --- Modal Enregistrement Règlement ---

  ouvrirModalPaiement(): void {
    const f = this.factureCourante;
    this.payMontant = f?.montantRestant || 0;
    this.payMethode = modePaiementRecu(f?.modePaiement);
    this.showPayModal = true;
    this.cdr.detectChanges();
  }

  fermerModalPaiement(): void {
    if (this.paying) return;
    this.showPayModal = false;
    this.cdr.detectChanges();
  }

  enregistrerPaiement(): void {
    const factureId = this.factureCourante?.id;
    const clientId = this.factureCourante?.clientId ?? this.data?.clientId;
    if (!factureId || this.payMontant <= 0) return;
    if (!clientId) {
      this.errorMessage = 'Client de la facture introuvable : impossible d’ouvrir son reçu.';
      this.cdr.detectChanges();
      return;
    }

    this.paying = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    // Encaissement via le reçu du client : le versement règle d'abord ses documents les plus anciens.
    this.recuService.verserPourClient(clientId, { montant: this.payMontant, modePaiement: this.payMethode }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.paying = false;
          this.showPayModal = false;
          this.successMessage = 'Règlement enregistré avec succès !';
          this.loadData();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.paying = false;
          this.errorMessage = err.error?.message || 'Erreur lors de l\'enregistrement du paiement.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  ouvrirModalPaiementNote(): void {
    const note = this.noteDePrixInfo;
    if (!note?.id || Number(note.resteAPayer || 0) <= 0) return;
    this.payNoteMontant = Number(note.resteAPayer) || 0;
    this.payNoteMethode = 'ESPECE';
    this.showPayNoteModal = true;
    this.cdr.detectChanges();
  }

  fermerModalPaiementNote(): void {
    if (this.payingNote) return;
    this.showPayNoteModal = false;
    this.cdr.detectChanges();
  }

  enregistrerPaiementNote(): void {
    const note = this.noteDePrixInfo;
    const montant = Number(this.payNoteMontant) || 0;
    const reste = Number(note?.resteAPayer) || 0;
    if (!note?.id || montant <= 0 || montant > reste || this.payingNote) return;

    this.payingNote = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();
    this.noteDePrixService.update(note.id, {
      clientId: this.data?.clientId ?? null,
      vehiculeId: this.data?.vehiculeId ?? null,
      ordreReparationId: this.ordreId,
      montantPaye: (Number(note.montantPaye) || 0) + montant,
      modePaiement: this.payNoteMethode,
    } as any).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.payingNote = false;
          this.showPayNoteModal = false;
          this.successMessage = 'Règlement de la note de prix enregistré.';
          this.loadData();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.payingNote = false;
          this.errorMessage = err.error?.message || 'Erreur lors de l’enregistrement du règlement de la note de prix.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  validateStep(): void {
    this.continuerVersPretALivrer();
  }

  continuerVersPretALivrer(): void {
    this.advancing = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.ordreService.updateStatut(this.ordreId, 'FACTURATION').subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'facturation']);
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.advancing = false;
          this.errorMessage = err.error?.message || 'Impossible de passer à la livraison.';
          this.cdr.detectChanges();
        });
      }
    });
  }
}
