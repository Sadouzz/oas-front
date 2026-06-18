import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PieceDetacheeService, PieceDetache } from '../services/piece-detachee.service';
import { AuthService } from '../auth/services/auth.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-pieces-detachees',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, NgClass, AlertComponent, PaginationComponent],
  templateUrl: './pieces-detachees.component.html',
})
export class PiecesDetacheesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(PieceDetacheeService);
  private authService = inject(AuthService);

  pieces: PieceDetache[] = [];
  filtered: PieceDetache[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showModal = false;
  isNew = false;
  editingId: number | null = null;

  readonly types = ['PDP', 'PDG', 'PDS'] as const;
  readonly statuts = ['ACTIF', 'INACTIF'] as const;
  readonly Math = Math;

  filterType = '';
  filterStatut = '';
  filterCategorie = '';
  categories: string[] = [];

  form = this.fb.group({
    type: ['PDP', Validators.required],
    numeroDeSerie: ['', Validators.required],
    reference: ['', Validators.required],
    categorie: ['', Validators.required],
    pourcentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    statut: ['ACTIF'],
    stockMagasin: [null as number | null],
    stockAtelier: [null as number | null],
    prix: [null as number | null],
    seuilMinimum: [null as number | null],
  });

  get totalArticles(): number { return this.pieces.filter(p => p.type === 'PDP').length; }
  get valeurStock(): number {
    return this.pieces
      .filter(p => p.type === 'PDP')
      .reduce((sum, p) => sum + (p.stockMagasin ?? 0) * (p.prix ?? 0), 0);
  }
  get stockCritique(): number {
    return this.pieces.filter(p => p.type === 'PDP' && (p.qteReelle ?? 0) > 0 && (p.qteReelle ?? 0) <= (p.seuilMinimum ?? 10)).length;
  }
  get ruptures(): number {
    return this.pieces.filter(p => p.type === 'PDP' && (p.qteReelle ?? 0) === 0).length;
  }

  get canEdit(): boolean {
    const r = this.authService.getRole();
    return r === 'ROLE_SUPER_AGENT' || r === 'ROLE_AGENT_MAGASIN';
  }

  get selectedType(): string {
    return this.form.get('type')?.value ?? 'PDP';
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.pieces = data.sort((a:any, b:any) => b.id - a.id);
        this.categories = [...new Set(data.map(p => p.categorie).filter(c => !!c))].sort();
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get lowStockPieces(): PieceDetache[] {
    return this.pieces.filter(p =>
      p.type === 'PDP' &&
      p.seuilMinimum != null &&
      (p.qteReelle ?? 0) <= p.seuilMinimum
    );
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilters(term);
  }

  applyFilters(keyword = '') {
    let result = this.pieces;
    if (keyword) result = result.filter(p =>
      p.reference.toLowerCase().includes(keyword) ||
      p.numeroDeSerie.toLowerCase().includes(keyword) ||
      p.categorie.toLowerCase().includes(keyword)
    );
    if (this.filterType) result = result.filter(p => p.type === this.filterType);
    if (this.filterStatut) result = result.filter(p => p.statut === this.filterStatut);
    if (this.filterCategorie) result = result.filter(p => p.categorie === this.filterCategorie);
    this.filtered = result;
    this.page = 1;
  }

  setFilterCategorie(cat: string) {
    this.filterCategorie = this.filterCategorie === cat ? '' : cat;
    this.applyFilters();
  }

  get paged(): PieceDetache[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  onTypeFilter(event: Event) {
    this.filterType = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  onStatutFilter(event: Event) {
    this.filterStatut = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset({ type: 'PDP', statut: 'ACTIF', pourcentage: 0 });
    this.showModal = true;
  }

  openEdit(p: PieceDetache) {
    this.isNew = false;
    this.editingId = p.id;
    this.form.patchValue({
      type: p.type,
      numeroDeSerie: p.numeroDeSerie,
      reference: p.reference,
      categorie: p.categorie,
      pourcentage: p.pourcentage,
      statut: p.statut,
      stockMagasin: p.stockMagasin ?? null,
      stockAtelier: p.stockAtelier ?? null,
      prix: p.prix ?? null,
      seuilMinimum: p.seuilMinimum ?? null,
    });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.form.reset({ type: 'PDP', statut: 'ACTIF' }); }

  save() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value as any;
    const payload = { ...val };
    if (val.type !== 'PDP') {
      delete payload.stockMagasin;
      delete payload.stockAtelier;
      delete payload.prix;
      delete payload.seuilMinimum;
    }

    if (this.isNew) {
      this.service.create(payload).subscribe({
        next: () => { this.saving = false; this.showSuccess('Pièce créée avec succès !'); this.closeModal(); this.load(); },
        error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la création.'; }
      });
    } else {
      this.service.update(this.editingId!, payload).subscribe({
        next: () => { this.saving = false; this.showSuccess('Pièce modifiée avec succès !'); this.closeModal(); this.load(); },
        error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la modification.'; }
      });
    }
  }

  deletePiece(p: PieceDetache) {
    if (!confirm(`Supprimer la pièce "${p.reference}" ?`)) return;
    this.service.delete(p.id).subscribe({
      next: () => { this.showSuccess('Pièce supprimée.'); this.load(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  typeBadge(type: string): string {
    const c: Record<string, string> = {
      PDP: 'bg-oas-info-bg text-oas-info',
      PDG: 'bg-oas-accent-bg text-oas-accent',
      PDS: 'bg-oas-warn-bg text-oas-warn',
    };
    return c[type] ?? 'bg-oas-bg text-oas-muted';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get f() { return this.form.controls; }
}
