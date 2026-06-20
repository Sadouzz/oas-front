import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StockService, InventaireResponse } from '../services/stock.service';
import { PieceDetacheeService, PieceDetache } from '../services/piece-detachee.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import { LucideSearch, LucideRefreshCw, LucideDownload, LucidePackage, LucideAlertTriangle, LucidePlus, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-inventaire',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, PaginationComponent, LucideSearch, LucideAlertTriangle, LucideX],
  templateUrl: './inventaire.component.html',
})
export class InventaireComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private pieceService = inject(PieceDetacheeService);

  pdps: PieceDetache[] = [];
  filtered: PieceDetache[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;

  selectedPiece: PieceDetache | null = null;
  showModal = false;
  submitting = false;
  result: InventaireResponse | null = null;
  errorMessage = '';
  successMessage = '';

  keyword = '';

  form = this.fb.group({
    stockMagasinPhysique: [null as number | null, [Validators.required, Validators.min(0)]],
    stockAtelierPhysique: [null as number | null, [Validators.required, Validators.min(0)]],
    motif: [''],
  });

  ngOnInit() {
    this.loading = true;
    this.pieceService.getAll({ type: 'PDP', statut: 'ACTIF' }).subscribe({
      next: (d) => { this.pdps = d.sort((a:any, b:any) => b.id - a.id); this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onSearch(event: Event) {
    this.keyword = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  applyFilter() {
    this.filtered = this.keyword
      ? this.pdps.filter(p =>
          p.reference.toLowerCase().includes(this.keyword) ||
          p.numeroDeSerie.toLowerCase().includes(this.keyword) ||
          p.categorie.toLowerCase().includes(this.keyword)
        )
      : this.pdps;
    this.page = 1;
  }

  get paged(): PieceDetache[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  openModal(p: PieceDetache) {
    this.selectedPiece = p;
    this.result = null;
    this.errorMessage = '';
    this.form.reset({
      stockMagasinPhysique: p.stockMagasin ?? 0,
      stockAtelierPhysique: p.stockAtelier ?? 0,
    });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.selectedPiece = null; this.result = null; }

  submit() {
    if (this.form.invalid || !this.selectedPiece) { this.form.markAllAsTouched(); return; }
    const { stockMagasinPhysique, stockAtelierPhysique, motif } = this.form.value;
    this.submitting = true;
    this.errorMessage = '';
    this.stockService.inventaire(this.selectedPiece.id, stockMagasinPhysique!, stockAtelierPhysique!, motif ?? '').subscribe({
      next: (res) => {
        this.result = res;
        this.submitting = false;
        this.selectedPiece!.stockMagasin = res.stockMagasinPhysique;
        this.selectedPiece!.stockAtelier = res.stockAtelierPhysique;
        this.selectedPiece!.qteReelle = res.stockMagasinPhysique + res.stockAtelierPhysique;
        const piece = this.pdps.find(p => p.id === this.selectedPiece!.id);
        if (piece) {
          piece.stockMagasin = res.stockMagasinPhysique;
          piece.stockAtelier = res.stockAtelierPhysique;
          piece.qteReelle = res.stockMagasinPhysique + res.stockAtelierPhysique;
        }
        if (res.ajuste) {
          this.showSuccess(`Stock de "${this.selectedPiece!.reference}" corrigé.`);
        }
      },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur.'; this.submitting = false; }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 4000);
  }

  get f() { return this.form.controls; }
}
