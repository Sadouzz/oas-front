import { Component, inject, OnInit, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideArrowLeft, LucideCheck, LucideReceipt, LucideLoader2, LucidePrinter, LucideTrash2 } from '@lucide/angular';
import { Observable } from 'rxjs';
import { RecuService } from '../recu.service';
import { RecuDetail, RecuDocument, RecuVersement, montantVersementValide } from '../models/recu.model';
import { PdfLayoutDialogService } from '../../../shared/components/pdf-layout-dialog/pdf-layout-dialog.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ConfirmationService } from '../../../shared/components/confirmation/confirmation.service';

@Component({
  selector: 'app-recu-detail',
  standalone: true,
  imports: [NgClass, FormsModule, RouterLink, AlertComponent, PaginationComponent, LucideArrowLeft, LucideCheck, LucideReceipt, LucideLoader2, LucidePrinter, LucideTrash2],
  templateUrl: './recu-detail.component.html'
})
export class RecuDetailComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private recuService = inject(RecuService);
  private confirmation = inject(ConfirmationService);
  private pdfLayoutDialog = inject(PdfLayoutDialogService);

  recu: RecuDetail | null = null;
  loading = true;
  /** Erreur bloquante (reçu introuvable, client sans rien à payer…). */
  loadError = '';

  montant: number | null = null;
  remarque = '';
  paying = false;
  validating = false;
  printing = false;
  /** Versement en cours d'annulation. */
  annulantId: number | null = null;
  formError = '';

  successMessage = '';
  errorMessage = '';

  /** Pagination de l'historique des versements (côté front, 5 par page). */
  versementsPageNum = 1;
  readonly versementsPageSize = 5;

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const clientId = Number(params.get('clientId'));
      const id = Number(params.get('id'));
      if (params.has('clientId')) {
        this.charger(this.recuService.ouvrirPourClient(clientId), true);
      } else {
        this.charger(this.recuService.getById(id), false);
      }
    });
  }

  private charger(source: Observable<RecuDetail>, depuisClient: boolean) {
    this.loading = true;
    this.loadError = '';
    this.recu = null;
    this.cdr.markForCheck();
    source.subscribe({
      next: recu => {
        this.applyRecu(recu);
        this.loading = false;
        // L'URL /client/{clientId} devient /{id} : un rechargement ne recrée pas de reçu.
        if (depuisClient) this.location.replaceState(`/app/gestion-recu/${recu.id}`);
        this.cdr.markForCheck();
      },
      error: err => {
        this.loading = false;
        this.loadError = this.errMsg(err, depuisClient ? 'Impossible d\'ouvrir le reçu de ce client.' : 'Reçu introuvable.');
        this.cdr.markForCheck();
      }
    });
  }

  private applyRecu(recu: RecuDetail) {
    this.recu = recu;
    this.versementsPageNum = 1;
    this.montant = recu.enCours && recu.resteAPayer > 0 ? recu.resteAPayer : null;
    this.formError = '';
  }

  /* ---------- Versement ---------- */

  /** Plafond d'un versement : le total restant du reçu. */
  get plafondVersement(): number {
    return Math.max(0, this.recu?.resteAPayer ?? 0);
  }

  remplirReste() {
    this.montant = this.plafondVersement || null;
    this.formError = '';
  }

  private validerFormulaire(): string {
    const recu = this.recu!;
    const m = Number(this.montant);
    if (this.montant === null || !Number.isFinite(m) || m <= 0) return 'Saisissez un montant supérieur à 0.';
    if (!montantVersementValide(m)) return 'Le montant ne peut pas avoir plus de deux décimales.';
    if (m > recu.resteAPayer) return `Le montant dépasse le total restant à payer (${this.fmt(recu.resteAPayer)} F CFA).`;
    return '';
  }

  payer() {
    if (!this.recu || !this.recu.enCours || this.paying) return;
    this.formError = this.validerFormulaire();
    if (this.formError) return;

    const id = this.recu.id;
    const montant = Number(this.montant);
    this.paying = true;
    this.cdr.markForCheck();
    this.recuService.verser(id, {
      montant,
      remarque: this.remarque.trim() || undefined,
    }).subscribe({
      next: recu => {
        this.paying = false;
        this.remarque = '';
        this.applyRecu(recu);
        this.notify(recu.enCours
          ? `Versement de ${this.fmt(montant)} F CFA enregistré.`
          : `Versement de ${this.fmt(montant)} F CFA enregistré : le reçu est soldé.`);
      },
      error: err => {
        this.paying = false;
        this.formError = this.errMsg(err, 'Erreur lors de l\'enregistrement du versement.');
        this.cdr.markForCheck();
      }
    });
  }

  /* ---------- Validation (reçu payé) ---------- */

  async valider() {
    if (!this.recu || this.recu.enCours || this.recu.valide || this.validating) return;
    const ok = await this.confirmation.confirm(
      `Valider le reçu n° ${this.recu.numeroRecu} ? La validation ne peut être faite qu'une fois.`,
      { title: 'Valider le reçu', confirmLabel: 'Valider' }
    );
    if (!ok) return;
    this.validating = true;
    this.cdr.markForCheck();
    this.recuService.valider(this.recu.id).subscribe({
      next: recu => {
        this.validating = false;
        this.recu = recu;
        this.notify('Reçu validé.');
      },
      error: err => {
        this.validating = false;
        this.notifyError(this.errMsg(err, 'Erreur lors de la validation du reçu.'));
      }
    });
  }

  /* ---------- Annulation d'un versement (corbeille de l'ancien écran) ---------- */

  async annulerVersement(v: RecuVersement) {
    if (!this.recu || this.recu.valide || this.annulantId !== null) return;
    const ok = await this.confirmation.confirm(
      `Supprimer le versement de ${this.fmt(v.montant)} F CFA du ${this.formatDate(v.dateVersement)} ? `
        + 'Les factures et notes de prix qu\'il réglait redeviennent à payer.',
      { title: 'Supprimer le versement', confirmLabel: 'Supprimer', danger: true }
    );
    if (!ok) return;
    this.annulantId = v.id;
    this.cdr.markForCheck();
    this.recuService.annulerVersement(this.recu.id, v.id).subscribe({
      next: recu => {
        this.annulantId = null;
        this.applyRecu(recu);
        this.notify(`Versement de ${this.fmt(v.montant)} F CFA supprimé.`);
      },
      error: err => {
        this.annulantId = null;
        this.notifyError(this.errMsg(err, 'Erreur lors de la suppression du versement.'));
      }
    });
  }

  /* ---------- Impression (« Voir/Imprimer reçu ») ---------- */

  async imprimer() {
    if (!this.recu || this.printing) return;
    const layoutKey = await this.pdfLayoutDialog.chooseLayout();
    if (!layoutKey) return;
    const recu = this.recu;
    this.printing = true;
    this.cdr.markForCheck();
    this.recuService.downloadPdf(recu.id, layoutKey).subscribe({
      next: blob => {
        this.printing = false;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        this.cdr.markForCheck();
      },
      error: err => {
        this.printing = false;
        this.notifyError(this.errMsg(err, 'Erreur lors de la génération du PDF du reçu.'));
      }
    });
  }

  retour() {
    this.router.navigate(['/app/gestion-recu'], { queryParams: { onglet: this.recu && !this.recu.enCours ? 'payes' : 'en-cours' } });
  }

  /* ---------- Affichage ---------- */

  get versementsTotalPages(): number {
    return Math.max(1, Math.ceil((this.recu?.versements.length ?? 0) / this.versementsPageSize));
  }

  get versementsPage() {
    const start = (this.versementsPageNum - 1) * this.versementsPageSize;
    return (this.recu?.versements ?? []).slice(start, start + this.versementsPageSize);
  }

  prevVersements() { if (this.versementsPageNum > 1) this.versementsPageNum--; }
  nextVersements() { if (this.versementsPageNum < this.versementsTotalPages) this.versementsPageNum++; }

  trackDoc(d: RecuDocument): string { return `${d.type}-${d.id}`; }

  formatDate(d: string | null | undefined, withTime = true): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR', withTime
      ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  fmt(n: number | null | undefined): string { return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n ?? 0); }

  private errMsg(err: any, fallback: string): string {
    return err?.error?.message || (typeof err?.error === 'string' ? err.error : '') || fallback;
  }

  private notify(msg: string) {
    this.successMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 4000);
  }

  private notifyError(msg: string) {
    this.errorMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 5000);
  }
}
