import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PieceDetacheeService, PieceDetache } from '../services/piece-detachee.service';
import { AuthService } from '../auth/services/auth.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-pieces-detachees',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, AlertComponent, PaginationComponent],
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

  filterType = '';
  filterStatut = '';

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
      next: (data) => { this.pieces = data; this.applyFilters(); this.loading = false; },
      error: () => { this.loading = false; }
    });
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
    this.filtered = result;
    this.page = 1;
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
      PDP: 'bg-blue-100 text-blue-800',
      PDG: 'bg-purple-100 text-purple-800',
      PDS: 'bg-orange-100 text-orange-800',
    };
    return c[type] ?? 'bg-gray-100 text-gray-700';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get f() { return this.form.controls; }
}
