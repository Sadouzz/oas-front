import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  AvoirTvaAcheteeResponse,
  FactureAcheteeResponse,
  TvaDeclarationResponseDto,
  TvaService,
  TvaVenteItemDto,
} from './tva.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationService } from '../../shared/components/confirmation/confirmation.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-tva-declaration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    AlertComponent,
    PaginationComponent,
  ],
  templateUrl: './tva-declaration.component.html',
})
export class TvaDeclarationComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private tvaService = inject(TvaService);
  private authService = inject(AuthService);
  private confirmation = inject(ConfirmationService);

  selectedMonth = this.currentMonthIso();
  readonly pageSize = 10;

  // Pages 1-based côté UI (envoyées en 0-based au back)
  pageVendu = 1;
  pageAvoirVendu = 1;
  pageAchete = 1;
  pageAvoirAchete = 1;

  data: TvaDeclarationResponseDto | null = null;
  loading = false;
  printingPdf = false;
  errorMessage = '';
  successMessage = '';

  // Modal Ajouter facture achetée
  showFactureAcheteeModal = false;
  savingFactureAchetee = false;
  factureAcheteeError = '';
  newFactureNumero = '';
  newFactureDate = this.todayIso();
  newFactureMontantTva: number | null = null;

  // Modal Ajouter Avoir TVA achetée
  showAvoirAcheteModal = false;
  savingAvoirAchete = false;
  avoirAcheteError = '';
  newAvoirDesignation = '';
  newAvoirDate = this.todayIso();
  newAvoirMontantTva: number | null = null;

  // Modal Correction manuelle du report (SUPER_AGENT / MASTER)
  showRapportModal = false;
  savingRapport = false;
  rapportError = '';
  editRapportMontant: number | null = 0;
  editRapportVerrouille = true;

  private loadSub?: Subscription;
  private loadSeq = 0;

  get canEditRapport(): boolean {
    return this.authService.hasRole('ROLE_SUPER_AGENT') || this.authService.hasRole('ROLE_MASTER');
  }

  get vendues(): TvaVenteItemDto[] {
    return this.data?.facturesVendues?.content ?? [];
  }

  get avoirsVendus(): TvaVenteItemDto[] {
    return this.data?.avoirsVendus?.content ?? [];
  }

  get achetees(): FactureAcheteeResponse[] {
    return this.data?.facturesAchetees?.content ?? [];
  }

  get avoirsAchetes(): AvoirTvaAcheteeResponse[] {
    return this.data?.avoirsTvaAchetees?.content ?? [];
  }

  ngOnInit(): void {
    this.loadDeclaration();
  }

  ngOnDestroy(): void {
    this.loadSub?.unsubscribe();
  }

  private currentMonthIso(): string {
    return new Date().toISOString().slice(0, 7);
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private defaultDateInSelectedMonth(): string {
    const today = this.todayIso();
    if (!this.selectedMonth || today.startsWith(this.selectedMonth)) {
      return today;
    }
    return `${this.selectedMonth}-01`;
  }

  onMonthChange(): void {
    this.pageVendu = 1;
    this.pageAvoirVendu = 1;
    this.pageAchete = 1;
    this.pageAvoirAchete = 1;
    this.loadDeclaration();
  }

  loadDeclaration(): void {
    const seq = ++this.loadSeq;
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.loadSub?.unsubscribe();
    this.loadSub = this.tvaService.getDeclaration({
      month: this.selectedMonth || undefined,
      pageVendu: this.pageVendu - 1,
      pageAvoirVendu: this.pageAvoirVendu - 1,
      pageAchete: this.pageAchete - 1,
      pageAvoirAchete: this.pageAvoirAchete - 1,
      size: this.pageSize,
    }).pipe(
      finalize(() => {
        if (seq === this.loadSeq) {
          this.loading = false;
          this.cdr.markForCheck();
        }
      })
    ).subscribe({
      next: (res) => {
        if (seq !== this.loadSeq) return;
        this.data = res;
        if (res?.month && !this.selectedMonth) {
          this.selectedMonth = res.month;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (seq !== this.loadSeq) return;
        this.errorMessage = err?.error?.message || 'Impossible de charger la déclaration TVA.';
        this.cdr.markForCheck();
      },
    });
  }

  onPageVenduChange(page: number): void {
    this.pageVendu = page;
    this.loadDeclaration();
  }

  onPageAvoirVenduChange(page: number): void {
    this.pageAvoirVendu = page;
    this.loadDeclaration();
  }

  onPageAcheteChange(page: number): void {
    this.pageAchete = page;
    this.loadDeclaration();
  }

  onPageAvoirAcheteChange(page: number): void {
    this.pageAvoirAchete = page;
    this.loadDeclaration();
  }

  voirImprimerPdf(): void {
    if (this.printingPdf) return;
    this.printingPdf = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.tvaService.downloadPdf(this.selectedMonth || undefined).pipe(
      finalize(() => {
        this.printingPdf = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `Liste-des-factures-${this.selectedMonth || this.currentMonthIso()}.pdf`;
          a.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.errorMessage = 'Impossible de générer le PDF de déclaration TVA.';
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Facture achetée ──────────────────────────────────
  openFactureAcheteeModal(): void {
    this.newFactureNumero = '';
    this.newFactureDate = this.defaultDateInSelectedMonth();
    this.newFactureMontantTva = null;
    this.factureAcheteeError = '';
    this.showFactureAcheteeModal = true;
    this.cdr.markForCheck();
  }

  closeFactureAcheteeModal(): void {
    if (this.savingFactureAchetee) return;
    this.showFactureAcheteeModal = false;
  }

  saveFactureAchetee(): void {
    const numeroFacture = this.newFactureNumero.trim();
    const dateFacture = this.newFactureDate;
    const montantTva = Number(this.newFactureMontantTva);

    if (!numeroFacture) {
      this.factureAcheteeError = 'Le numéro de facture est requis.';
      return;
    }
    if (!dateFacture) {
      this.factureAcheteeError = 'La date de facture est requise.';
      return;
    }
    if (!Number.isFinite(montantTva) || montantTva < 0) {
      this.factureAcheteeError = 'Le montant de TVA doit être supérieur ou égal à 0.';
      return;
    }

    this.savingFactureAchetee = true;
    this.factureAcheteeError = '';
    this.cdr.markForCheck();

    this.tvaService.addFactureAchetee({ numeroFacture, dateFacture, montantTva }).pipe(
      finalize(() => {
        this.savingFactureAchetee = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.showFactureAcheteeModal = false;
        this.successMessage = `Facture achetée ${numeroFacture} enregistrée.`;
        if (dateFacture.slice(0, 7) !== this.selectedMonth) {
          this.selectedMonth = dateFacture.slice(0, 7);
        }
        this.pageAchete = 1;
        this.loadDeclaration();
      },
      error: (err) => {
        this.factureAcheteeError = err?.error?.message || "Impossible d'ajouter la facture achetée.";
      },
    });
  }

  async deleteFactureAchetee(item: FactureAcheteeResponse): Promise<void> {
    const ok = await this.confirmation.confirm(
      `Supprimer la facture achetée "${item.numeroFacture}" (${item.montantTva} F CFA) ?`,
      { title: 'Supprimer la facture achetée', confirmLabel: 'Supprimer', danger: true }
    );
    if (!ok) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.tvaService.deleteFactureAchetee(item.id).subscribe({
      next: () => {
        this.successMessage = `Facture achetée ${item.numeroFacture} supprimée.`;
        this.loadDeclaration();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Impossible de supprimer cette facture achetée.';
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Avoir TVA achetée ────────────────────────────────
  openAvoirAcheteModal(): void {
    this.newAvoirDesignation = '';
    this.newAvoirDate = this.defaultDateInSelectedMonth();
    this.newAvoirMontantTva = null;
    this.avoirAcheteError = '';
    this.showAvoirAcheteModal = true;
    this.cdr.markForCheck();
  }

  closeAvoirAcheteModal(): void {
    if (this.savingAvoirAchete) return;
    this.showAvoirAcheteModal = false;
  }

  saveAvoirAchete(): void {
    const designation = this.newAvoirDesignation.trim();
    const dateOperation = this.newAvoirDate;
    const montantTva = Number(this.newAvoirMontantTva);

    if (!designation) {
      this.avoirAcheteError = 'La désignation est requise.';
      return;
    }
    if (!dateOperation) {
      this.avoirAcheteError = "La date d'opération est requise.";
      return;
    }
    if (!Number.isFinite(montantTva) || montantTva < 0) {
      this.avoirAcheteError = 'Le montant de TVA doit être supérieur ou égal à 0.';
      return;
    }

    this.savingAvoirAchete = true;
    this.avoirAcheteError = '';
    this.cdr.markForCheck();

    this.tvaService.addAvoirTvaAchetee({ designation, dateOperation, montantTva }).pipe(
      finalize(() => {
        this.savingAvoirAchete = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.showAvoirAcheteModal = false;
        this.successMessage = `Avoir TVA achetée "${designation}" enregistré.`;
        if (dateOperation.slice(0, 7) !== this.selectedMonth) {
          this.selectedMonth = dateOperation.slice(0, 7);
        }
        this.pageAvoirAchete = 1;
        this.loadDeclaration();
      },
      error: (err) => {
        this.avoirAcheteError = err?.error?.message || "Impossible d'ajouter l'avoir TVA achetée.";
      },
    });
  }

  async deleteAvoirTvaAchetee(item: AvoirTvaAcheteeResponse): Promise<void> {
    const ok = await this.confirmation.confirm(
      `Supprimer l'avoir TVA achetée "${item.designation}" (${item.montantTva} F CFA) ?`,
      { title: "Supprimer l'avoir TVA achetée", confirmLabel: 'Supprimer', danger: true }
    );
    if (!ok) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.tvaService.deleteAvoirTvaAchetee(item.id).subscribe({
      next: () => {
        this.successMessage = `Avoir TVA achetée "${item.designation}" supprimé.`;
        this.loadDeclaration();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || "Impossible de supprimer cet avoir TVA achetée.";
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Correction manuelle du report ────────────────────
  openRapportModal(): void {
    if (!this.canEditRapport) return;
    this.editRapportMontant = this.data?.rapport ?? 0;
    this.editRapportVerrouille = true;
    this.rapportError = '';
    this.showRapportModal = true;
    this.cdr.markForCheck();
  }

  closeRapportModal(): void {
    if (this.savingRapport) return;
    this.showRapportModal = false;
  }

  saveRapport(): void {
    const montant = Number(this.editRapportMontant);
    if (!Number.isFinite(montant) || montant > 0) {
      this.rapportError = 'Le montant du report doit être inférieur ou égal à 0.';
      return;
    }

    this.savingRapport = true;
    this.rapportError = '';
    this.cdr.markForCheck();

    this.tvaService.updateRapport({
      month: this.selectedMonth || this.currentMonthIso(),
      montant,
      verrouilleManuellement: this.editRapportVerrouille,
    }).pipe(
      finalize(() => {
        this.savingRapport = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: () => {
        this.showRapportModal = false;
        this.successMessage = 'Report TVA mis à jour.';
        this.loadDeclaration();
      },
      error: (err) => {
        this.rapportError = err?.error?.message || 'Impossible de mettre à jour le report TVA.';
      },
    });
  }
}
