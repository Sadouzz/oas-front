import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { StepPretALivrerResponseDto } from '../../../models/responses/step-pret-a-livrer-response.dto';
import { BonDeLivraisonService } from '../../../../bons-livraison/bon-de-livraison.service';
import { FactureService } from '../../../../factures/facture.service';
import { FactureModel } from '../../../../factures/models/facture.model';
import { modePaiementRecu } from '../../../../factures/models/facture-mode-paiement';
import { ClientService } from '../../../../clients/client.service';
import { NoteDePrixService } from '../../../../notes-prix/note-de-prix.service';
import { NoteDePrixModel } from '../../../../notes-prix/models/note-de-prix.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { PdfLayoutDialogService } from '../../../../../shared/components/pdf-layout-dialog/pdf-layout-dialog.service';
import { extractContent } from '../../../../../shared/models';
import {
  EnrichableLignePiece,
  PieceLigneType,
  pieceTypeBadgeClass,
  resolvePieceDesignation,
  resolvePieceType,
} from '../../../../../shared/utils/piece-ligne.util';

@Component({
  selector: 'app-step-pret-a-livrer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-pret-a-livrer.component.html'
})
export class StepPretALivrerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private bonDeLivraisonService = inject(BonDeLivraisonService);
  private factureService = inject(FactureService);
  private clientService = inject(ClientService);
  private noteDePrixService = inject(NoteDePrixService);
  private pdfLayoutDialog = inject(PdfLayoutDialogService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  data: StepPretALivrerResponseDto | null = null;
  remarquesPreparation = '';

  facture: FactureModel | null = null;
  noteDePrix: NoteDePrixModel | null = null;
  docLoading = false;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  showFullPaymentModal = false;
  fullPaymentSaving = false;
  fullPaymentMethod = 'ESPECE';
  fullPaymentWalletBalance: number | null = null;
  loadingFullPaymentWallet = false;
  fullPaymentWalletLoadFailed = false;
  fullPaymentErrorMessage = '';

  get factureResteAPayer(): number {
    if (!this.facture) return 0;
    const montantTotal = Number(this.facture.montantTotal);
    if (Number.isFinite(montantTotal)) {
      return Math.max(0, montantTotal - Number(this.facture.montantPaye || 0));
    }
    const resteBrut = this.facture.resteAPayer;
    const reste = Number(resteBrut);
    if (resteBrut != null && Number.isFinite(reste)) return Math.max(0, reste);
    return Math.max(0, Number(this.facture.montantTotal || 0) - Number(this.facture.montantPaye || 0));
  }

  get factureNecessitePaiementIntegral(): boolean {
    return !!this.facture && this.facture.statutPaiement !== 'PAYE' && this.factureResteAPayer > 0;
  }

  get fullPaymentWalletInsufficient(): boolean {
    return this.fullPaymentMethod === 'SOLDE_PREPAYE'
      && this.fullPaymentWalletBalance !== null
      && this.fullPaymentWalletBalance < this.factureResteAPayer;
  }

  get canConfirmFullPayment(): boolean {
    return !this.fullPaymentSaving
      && !this.loadingFullPaymentWallet
      && this.factureResteAPayer > 0
      && (this.fullPaymentMethod !== 'SOLDE_PREPAYE'
        || (this.fullPaymentWalletBalance !== null && this.fullPaymentWalletBalance >= this.factureResteAPayer));
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
    this.docLoading = true;
    this.facture = null;
    this.noteDePrix = null;

    this.ordreService.getStepFacturation(this.ordreId).subscribe({
      next: (res) => {
        this.data = res;
        this.remarquesPreparation = res.remarquesPreparation || '';
        this.loading = false;

        if (res.facture) {
          this.facture = res.facture as any;
          this.docLoading = false;
        } else if (res.noteDePrix) {
          this.noteDePrix = res.noteDePrix as any;
          this.docLoading = false;
        } else {
          this.loadAssociatedDocument();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.docLoading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des informations de facturation.';
        this.cdr.markForCheck();
      }
    });
  }

  private loadAssociatedDocument(): void {
    this.docLoading = true;
    this.facture = null;
    this.noteDePrix = null;
    this.cdr.markForCheck();

    const loadByIds = (factureId?: number | null, noteDePrixId?: number | null) => {
      if (factureId) {
        return this.factureService.getById(factureId).pipe(
          switchMap(f => of({ kind: 'facture' as const, doc: f })),
          catchError(() => of(null))
        );
      }
      if (noteDePrixId) {
        return this.noteDePrixService.getById(noteDePrixId).pipe(
          switchMap(n => of({ kind: 'note' as const, doc: n })),
          catchError(() => of(null))
        );
      }
      return of(null);
    };

    this.bonDeLivraisonService.getContexteOrdre(this.ordreId).pipe(
      catchError(() => of(null)),
      switchMap(contexte => {
        const ctxFactureId = contexte?.bonDeLivraison?.factureId ?? null;
        const ctxNoteId = contexte?.bonDeLivraison?.noteDePrixId ?? null;
        if (ctxFactureId || ctxNoteId) {
          return loadByIds(ctxFactureId, ctxNoteId);
        }
        return this.ordreService.getStepBL(this.ordreId).pipe(
          catchError(() => of(null)),
          switchMap(stepBl => {
            const blFactureId = stepBl?.facture?.id ?? stepBl?.bonDeLivraison?.factureId ?? null;
            const blNoteId = stepBl?.noteDePrix?.id ?? stepBl?.bonDeLivraison?.noteDePrixId ?? null;
            if (blFactureId || blNoteId) {
              return loadByIds(blFactureId, blNoteId);
            }
            return this.factureService.getAll({ page: 0, size: 1, ordreReparationId: this.ordreId } as any).pipe(
              switchMap(res => {
                const list = extractContent<{ id?: number }>(res);
                return loadByIds(list[0]?.id ?? null, null);
              }),
              catchError(() => of(null))
            );
          })
        );
      })
    ).subscribe(result => {
      if (result?.kind === 'facture') {
        this.facture = result.doc;
      } else if (result?.kind === 'note') {
        this.noteDePrix = result.doc;
      }
      this.docLoading = false;
      this.cdr.markForCheck();
    });
  }

  pieceDesignation(l: EnrichableLignePiece): string {
    return resolvePieceDesignation(l);
  }

  pieceType(l: EnrichableLignePiece): PieceLigneType {
    return resolvePieceType(l);
  }

  pieceTypeClass(l: EnrichableLignePiece): string {
    return pieceTypeBadgeClass(this.pieceType(l));
  }

  modePaiementLabel(mp?: string | null): string {
    const m: Record<string, string> = {
      CHEQUE: 'Chèque',
      ESPECE: 'Espèces',
      VIREMENT: 'Virement',
      SOLDE_PREPAYE: 'Solde prépayé',
      ESPECE_TTC: 'Espèces TTC',
      CHEQUE_TTC: 'Chèque TTC',
      ESPECE_HT: 'Espèces HT',
      CHEQUE_HT: 'Chèque HT',
      WAVE: 'Wave',
      ORANGE_MONEY: 'Orange Money',
      CARTE_BANCAIRE: 'Carte bancaire',
      CARTE: 'Carte',
      AUTRE: 'Autre',
    };
    return m[mp ?? ''] ?? mp ?? '—';
  }

  statutPaiementLabel(statut?: string | null): string {
    if (statut === 'PAYE') return 'Payée';
    if (statut === 'PARTIEL') return 'Partiellement payée';
    return 'Non payée';
  }

  statutPaiementClass(statut?: string | null): string {
    if (statut === 'PAYE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (statut === 'PARTIEL') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }

  remiseGeneraleFacture(f: FactureModel): number {
    const remisePieces = (f.lignesPieces ?? []).reduce((total, ligne) => {
      const brut = (Number(ligne.quantite) || 0) * (Number(ligne.prix) || 0);
      const net = Number.isFinite(Number(ligne.montantTotal))
        ? Number(ligne.montantTotal)
        : Math.round(brut * (1 - (Number(ligne.tauxRemise) || 0) / 100));
      return total + brut - net;
    }, 0);
    const remiseMo = (f.lignesMainDoeuvres ?? []).reduce((total, ligne) => {
      const brut = (Number(ligne.nbreHeure) || 0) * (Number(ligne.tarifHoraire) || 0);
      const net = Number.isFinite(Number(ligne.montantTotal))
        ? Number(ligne.montantTotal)
        : Math.round(brut * (1 - (Number(ligne.tauxRemise) || 0) / 100));
      return total + brut - net;
    }, 0);
    return remisePieces + remiseMo;
  }

  async downloadFacturePdf(id: number): Promise<void> {
    const layoutKey = await this.pdfLayoutDialog.chooseLayout();
    if (!layoutKey) return;
    this.factureService.downloadPdf(id, layoutKey).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${id}-${layoutKey === 'AVEC_ENTETE' ? 'avec-entete' : 'sans-entete'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  formatDate(d: string | number[] | null | undefined): string {
    if (!d) return '—';
    const date = Array.isArray(d) ? new Date(d[0], (d[1] ?? 1) - 1, d[2] ?? 1) : new Date(d);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR');
  }

  fmt(n?: number | null): string {
    return new Intl.NumberFormat('fr-FR').format(n ?? 0);
  }

  validateStep(): void {
    this.continuerVersLivraisonSansPaiement();
  }

  ouvrirConfirmationPaiementIntegral(): void {
    if (!this.facture || this.factureResteAPayer <= 0 || this.facture.statutPaiement === 'PAYE') return;
    this.errorMessage = '';
    this.successMessage = '';
    this.fullPaymentErrorMessage = '';
    this.fullPaymentMethod = modePaiementRecu(this.facture.modePaiement);
    this.fullPaymentWalletBalance = null;
    this.fullPaymentWalletLoadFailed = false;
    this.showFullPaymentModal = true;
    if (this.fullPaymentMethod === 'SOLDE_PREPAYE') this.chargerSoldePrepaye();
  }

  fermerConfirmationPaiementIntegral(): void {
    if (this.fullPaymentSaving) return;
    this.showFullPaymentModal = false;
    this.fullPaymentErrorMessage = '';
  }

  changerModePaiementIntegral(): void {
    this.fullPaymentWalletBalance = null;
    this.fullPaymentWalletLoadFailed = false;
    if (this.fullPaymentMethod === 'SOLDE_PREPAYE') this.chargerSoldePrepaye();
  }

  private chargerSoldePrepaye(): void {
    const clientId = this.facture?.clientId;
    if (!clientId) {
      this.fullPaymentWalletBalance = 0;
      return;
    }
    this.loadingFullPaymentWallet = true;
    this.clientService.getPortefeuille(clientId).subscribe({
      next: wallet => {
        this.fullPaymentWalletBalance = Number(wallet.solde) || 0;
        this.loadingFullPaymentWallet = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.fullPaymentWalletBalance = 0;
        this.loadingFullPaymentWallet = false;
        this.fullPaymentWalletLoadFailed = true;
        this.cdr.markForCheck();
      }
    });
  }

  confirmerPaiementIntegral(): void {
    if (!this.facture?.id || !this.canConfirmFullPayment) return;
    this.fullPaymentSaving = true;
    this.fullPaymentErrorMessage = '';
    this.factureService.payFactureTotal(this.facture.id, this.fullPaymentMethod).subscribe({
      next: (recu: any) => {
        this.fullPaymentSaving = false;
        this.showFullPaymentModal = false;
        this.successMessage = `Paiement intégral enregistré${recu?.numero ? ` · reçu ${recu.numero}` : ''}.`;
        this.cdr.markForCheck();
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'livraison']);
      },
      error: (err: any) => {
        this.fullPaymentSaving = false;
        this.fullPaymentErrorMessage = err?.error?.message || 'Impossible d’enregistrer le paiement intégral.';
        this.cdr.markForCheck();
      }
    });
  }

  continuerVersLivraisonSansPaiement(): void {
    if (this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.ordreService.updateStatut(this.ordreId, 'FACTURATION').subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'livraison']);
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Impossible de poursuivre vers la livraison.';
        this.cdr.markForCheck();
      }
    });
  }
}
