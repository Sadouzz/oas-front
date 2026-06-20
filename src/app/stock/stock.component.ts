import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StockService, StockMouvement } from '../services/stock.service';
import { PieceDetacheeService, PieceDetache, AlerteStock } from '../services/piece-detachee.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import { LucideSearch, LucidePlus, LucideX,  LucidePackage, LucideArrowRight, LucideRefreshCw, LucideDownload } from '@lucide/angular';

type ModalType = 'entree' | 'sortie' | 'ajustement' | null;

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AlertComponent, PaginationComponent ],
  templateUrl: './stock.component.html',
})
export class StockComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private pieceService = inject(PieceDetacheeService);

  alertes: AlerteStock[] = [];
  alertePage = 1;
  readonly pageSize = 10;
  mouvementsRecents: StockMouvement[] = [];
  pdps: PieceDetache[] = [];
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  modalType: ModalType = null;

  mouvementForm = this.fb.group({
    pieceId: [null as number | null, Validators.required],
    quantite: [null as number | null, [Validators.required, Validators.min(1)]],
    motif: [''],
  });

  ajustementForm = this.fb.group({
    pieceId: [null as number | null, Validators.required],
    stockMagasin: [null as number | null, [Validators.required, Validators.min(0)]],
    stockAtelier: [null as number | null, [Validators.required, Validators.min(0)]],
    motif: [''],
  });

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading = true;
    this.stockService.alertes().subscribe({ next: (d) => { this.alertes = d; this.checkDone(); }, error: () => this.checkDone() });
    this.pieceService.getAll({ type: 'PDP' }).subscribe({ next: (d) => { this.pdps = d; this.checkDone(); }, error: () => this.checkDone() });
    this.loadMovementsRecent();
  }

  private loadCount = 0;
  private checkDone() { if (++this.loadCount >= 2) this.loading = false; }

  loadMovementsRecent() {
    const now = new Date();
    const debut = new Date(now);
    debut.setDate(debut.getDate() - 30);
    this.stockService.historiqueGlobal(debut.toISOString(), now.toISOString()).subscribe({
      next: (d) => { this.mouvementsRecents = d.slice(0, 10); }
    });
  }

  get ruptures(): AlerteStock[] { return this.alertes.filter(a => a.typeAlerte === 'RUPTURE'); }
  get stocksFaibles(): AlerteStock[] { return this.alertes.filter(a => a.typeAlerte === 'STOCK_FAIBLE'); }

  get pagedAlertes(): AlerteStock[] { return this.alertes.slice((this.alertePage - 1) * this.pageSize, this.alertePage * this.pageSize); }
  get alertesTotalPages(): number { return Math.max(1, Math.ceil(this.alertes.length / this.pageSize)); }
  prevAlertePage(): void { if (this.alertePage > 1) this.alertePage--; }
  nextAlertePage(): void { if (this.alertePage < this.alertesTotalPages) this.alertePage++; }

  openModal(type: ModalType) {
    this.modalType = type;
    this.mouvementForm.reset();
    this.ajustementForm.reset();
    this.errorMessage = '';
  }

  closeModal() { this.modalType = null; }

  submitMouvement() {
    if (this.mouvementForm.invalid || this.saving) { this.mouvementForm.markAllAsTouched(); return; }
    this.saving = true;
    const { pieceId, quantite, motif } = this.mouvementForm.value;
    const obs = this.modalType === 'entree'
      ? this.stockService.entree(pieceId!, quantite!, motif ?? '')
      : this.stockService.sortie(pieceId!, quantite!, motif ?? '');
    obs.subscribe({
      next: () => { this.saving = false; this.showSuccess(this.modalType === 'entree' ? 'Entrée enregistrée !' : 'Sortie enregistrée !'); this.closeModal(); this.loadAll(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  submitAjustement() {
    if (this.ajustementForm.invalid || this.saving) { this.ajustementForm.markAllAsTouched(); return; }
    this.saving = true;
    const { pieceId, stockMagasin, stockAtelier, motif } = this.ajustementForm.value;
    this.stockService.ajustement(pieceId!, stockMagasin!, stockAtelier!, motif ?? '').subscribe({
      next: () => { this.saving = false; this.showSuccess('Ajustement enregistré !'); this.closeModal(); this.loadAll(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  typeMouvClass(type: string): string {
    const c: Record<string, string> = {
      ENTREE: 'bg-oas-ok-bg text-oas-ok',
      SORTIE: 'bg-oas-bad-bg text-oas-bad',
      AJUSTEMENT: 'bg-oas-info-bg text-oas-info',
      INVENTAIRE: 'bg-oas-accent-bg text-oas-accent',
    };
    return c[type] ?? 'bg-oas-bg text-oas-muted';
  }

  formatDate(d: string): string { return new Date(d).toLocaleString('fr-FR'); }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get fm() { return this.mouvementForm.controls; }
  get fa() { return this.ajustementForm.controls; }
}
