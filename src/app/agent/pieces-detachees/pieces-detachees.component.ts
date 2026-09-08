import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PieceDetacheeService, PieceStats } from './piece-detachee.service';
import { DepotService } from './depot.service';
import { CategoriePieceService } from './categorie-piece.service';
import { PieceDetache, Depot, CategoriePiece, PageParams, extractContent } from '../../shared/models';
import { AuthService } from '../../core/services/auth.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideArchive, LucideArchiveRestore, LucideShoppingCart } from '@lucide/angular';

@Component({
  selector: 'app-pieces-detachees',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, NgClass, AlertComponent, PaginationComponent, SearchableSelectComponent, LucideShoppingCart],
  templateUrl: './pieces-detachees.component.html',
})
export class PiecesDetacheesComponent extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private service = inject(PieceDetacheeService);
  private depotService = inject(DepotService);
  private categorieService = inject(CategoriePieceService);
  private authService = inject(AuthService);
  private router = inject(Router);

  pieces: PieceDetache[] = [];
  filtered: PieceDetache[] = [];
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showModal = false;
  isNew = false;
  editingId: number | null = null;

  readonly types = ['PDP', 'PDG'] as const;
  readonly statuts = ['ACTIF', 'INACTIF'] as const;
  readonly Math = Math;

  filterType = '';
  filterStatut = 'ACTIF';
  filterDepot = '';
  depotsFilters: string[] = [];

  categories: CategoriePiece[] = [];
  depots: Depot[] = [];
  filteredCategories: CategoriePiece[] = [];

  form = this.fb.group({
    type: ['PDP', Validators.required],
    reference: ['', Validators.required],
    designation: ['', Validators.required],
    depotId: [null as number | null],
    categorie: ['', Validators.required],
    // pourcentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    // statut: ['ACTIF'],
    stockMagasin: [null as number | null],
    stockAtelier: [null as number | null],
    prix: [null as number | null],
    seuilMinimum: [null as number | null],
  });

  stats: PieceStats = { totalArticles: 0, valeurStock: 0, stockCritique: 0, ruptures: 0 };

  get totalArticles(): number { return this.stats.totalArticles; }
  get valeurStock(): number { return this.stats.valeurStock; }
  get stockCritique(): number { return this.stats.stockCritique; }
  get ruptures(): number { return this.stats.ruptures; }

  get canEdit(): boolean {
    const r = this.authService.getRole();
    return r === 'ROLE_SUPER_AGENT' || r === 'ROLE_MASTER' || r === 'ROLE_AGENT_MAGASIN';
  }

  get selectedType(): string {
    return this.form.get('type')?.value ?? 'PDP';
  }

  ngOnInit() {
    this.loadData();
    this.loadReferences();
    this.loadStats();
    this.setupFormListeners();
  }

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    const params = this.getPageParams();
    this.service.getAll(params).subscribe({
      next: (data) => {
        const arr = this.applyPageResponse<PieceDetache>(data);
        this.pieces = arr.sort((a: any, b: any) => b.id - a.id);
        if (this.depotsFilters.length === 0) {
          const fromPieces = [...new Set(arr.map((p: any) => p.categorie?.depot?.nom || p.depot?.nom || (p as any).depotNom).filter((d: any) => !!d))].sort() as string[];
          if (fromPieces.length > 0) this.depotsFilters = fromPieces;
        }
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  commanderPiece(p: PieceDetache) {
    this.router.navigate(['/app/bons-commande'], { queryParams: { pieceId: p.id } });
  }

  loadStats() {
    this.service.getStats().subscribe({
      next: (res) => {
        if (res) {
          this.stats = res;
          this.cdr.markForCheck();
        }
      },
      error: () => {}
    });
  }

  loadReferences() {
    this.loadDepots();
    this.loadCategories();
  }

  loadDepots() {
    this.depotService.getAll().subscribe({
      next: (res) => {
        const list = extractContent<Depot>(res);
        this.depots = list;
        this.depotsFilters = [...new Set(list.map(d => d.nom).filter(Boolean))].sort();
        if (this.isNew && this.filterDepot) {
          const depot = this.depots.find(d => d.nom === this.filterDepot);
          if (depot) {
            this.form.patchValue({ depotId: depot.id });
          }
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadCategories() {
    this.categorieService.getAll().subscribe({
      next: (res) => {
        const list = extractContent<CategoriePiece>(res);
        this.categories = list;
        this.updateFilteredCategories();
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  updateFilteredCategories() {
    const currentDepotId = this.form.get('depotId')?.value;
    if (currentDepotId) {
      this.filteredCategories = this.categories.filter(c => c.depot?.id === Number(currentDepotId));
    } else {
      this.filteredCategories = this.categories;
    }
    this.cdr.markForCheck();
  }

  setupFormListeners() {
    this.form.get('depotId')?.valueChanges.subscribe(() => {
      this.updateFilteredCategories();
    });

    this.form.get('categorie')?.valueChanges.subscribe(categorieNom => {
      if (categorieNom && !this.form.get('depotId')?.value) {
        const cat = this.categories.find(c => c.nom === categorieNom);
        if (cat && cat.depot?.id) {
          this.form.patchValue({ depotId: cat.depot.id }, { emitEvent: false });
          this.updateFilteredCategories();
        }
      }
    });
  }

  // onSearch inherited from BasePaginatedComponent

  protected override getPageParams(extraParams: Record<string, any> = {}): PageParams {
    const extra: Record<string, any> = { ...extraParams };
    if (this.filterStatut) {
      extra['statut'] = this.filterStatut;
      extra['status'] = this.filterStatut;
    }
    if (this.filterType) {
      extra['type'] = this.filterType;
    }
    if (this.filterDepot) {
      extra['depot'] = this.filterDepot;
    }
    return super.getPageParams(extra);
  }

  applyFilters(keyword = '') {
    let result = this.pieces;
    if (keyword) result = result.filter((p: any) => {
      const catName = p.categorie?.nom || p.categorie || '';
      return (p.designation?.toLowerCase().includes(keyword) || false) ||
        (p.reference?.toLowerCase().includes(keyword) || false) ||
        catName.toLowerCase().includes(keyword);
    });
    if (this.filterType) result = result.filter((p: any) => p.type === this.filterType);
    if (this.filterStatut) result = result.filter((p: any) => p.statut === this.filterStatut);
    if (this.filterDepot) result = result.filter((p: any) => p.categorie?.depot?.nom === this.filterDepot);
    this.filtered = result;
  }

  setFilterDepot(depot: string) {
    this.filterDepot = this.filterDepot === depot ? '' : depot;
    this.page = 1;
    this.loadData();
  }

  get paged(): PieceDetache[] { return this.filtered; }

  onTypeFilter(event: Event) {
    this.filterType = (event.target as HTMLSelectElement).value;
    this.page = 1;
    this.loadData();
  }

  onStatutFilter(event: Event) {
    this.filterStatut = (event.target as HTMLSelectElement).value;
    this.page = 1;
    this.loadData();
  }

  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.errorMessage = '';
    this.form.reset({ type: 'PDP' });
    this.showModal = true;
    this.loadReferences();
    if (this.filterDepot) {
      const depot = this.depots.find(d => d.nom === this.filterDepot);
      if (depot) {
        this.form.patchValue({ depotId: depot.id });
      }
    }
    this.updateFilteredCategories();
  }

  openEdit(p: PieceDetache) {
    this.isNew = false;
    this.editingId = p.id;
    this.errorMessage = '';
    const depotId = (p.categorie as any)?.depot?.id || null;
    this.form.patchValue({
      type: p.type,
      reference: p.reference,
      designation: p.designation,
      categorie: (p.categorie as any)?.nom || p.categorie,
      stockMagasin: p.stockMagasin ?? null,
      stockAtelier: p.stockAtelier ?? null,
      prix: p.prixUnitaire ?? p.prix ?? null,
      seuilMinimum: p.seuilMinimum ?? null,
      depotId: depotId
    });
    this.showModal = true;
    this.loadReferences();
    this.updateFilteredCategories();
  }

  closeModal() { 
    this.showModal = false; 
    this.errorMessage = '';
    this.form.reset({ type: 'PDP' }); 
  }

  save() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.errorMessage = '';
    const val = this.form.value as any;
    const payload = { ...val };

    // Validation d'unicité de la référence
    const refExists = this.pieces.some(p => 
      p.reference.toLowerCase().trim() === payload.reference.toLowerCase().trim() && 
      p.id !== this.editingId
    );
    if (refExists) {
      this.saving = false;
      this.errorMessage = `La référence "${payload.reference}" existe déjà dans le catalogue.`;
      return;
    }

    // Validation d'unicité de la désignation
    const desExists = this.pieces.some(p => 
      p.designation.toLowerCase().trim() === payload.designation.toLowerCase().trim() && 
      p.id !== this.editingId
    );
    if (desExists) {
      this.saving = false;
      this.errorMessage = `La désignation "${payload.designation}" existe déjà dans le catalogue.`;
      return;
    }

    if (payload.type === 'PDG') {
      delete payload.stockMagasin;
      delete payload.stockAtelier;
      delete payload.prix;
      delete payload.seuilMinimum;
    }

    delete payload.depotId;
    delete payload.stockAtelier; // Backend ignores it or fails on unknown properties

    if (this.isNew) {
      this.service.create(payload).subscribe({
        next: () => { this.saving = false; this.showSuccess('Pièce créée avec succès !'); this.closeModal(); this.load(); this.loadStats(); },
        error: (err: any) => {
          console.error("Erreur backend:", err);
          this.saving = false;
          this.errorMessage = typeof err.error === 'string' ? err.error : (err.error?.message || 'Erreur lors de la création.');
        }
      });
    } else {
      this.service.update(this.editingId!, payload).subscribe({
        next: () => { this.saving = false; this.showSuccess('Pièce modifiée avec succès !'); this.closeModal(); this.load(); this.loadStats(); },
        error: (err: any) => {
          console.error("Erreur backend:", err);
          this.saving = false;
          this.errorMessage = typeof err.error === 'string' ? err.error : (err.error?.message || 'Erreur lors de la modification.');
        }
      });
    }
  }

  deletePiece(p: PieceDetache) {
    if (!confirm(`Supprimer la pièce "${p.reference}" ?`)) return;
    this.service.delete(p.id).subscribe({
      next: () => { this.showSuccess('Pièce supprimée.'); this.load(); this.loadStats(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  restorePiece(p: PieceDetache) {
    if (!confirm(`Restaurer la pièce archivée "${p.reference}" ?`)) return;
    this.service.restore(p.id).subscribe({
      next: () => { this.showSuccess('Pièce restaurée avec succès !'); this.load(); this.loadStats(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la restauration.'; }
    });
  }

  typeBadge(type: string): string {
    const c: Record<string, string> = {
      PDP: 'bg-oas-info-bg text-oas-info',
      PDG: 'bg-oas-accent-bg text-oas-accent',
    };
    return c[type] ?? 'bg-oas-bg text-oas-muted';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get f() { return this.form.controls; }
}
