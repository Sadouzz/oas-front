import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { PieceDetacheeService, PieceStats } from './piece-detachee.service';
import { DepotService } from './depot.service';
import { CategoriePieceService } from './categorie-piece.service';
import { PieceDetache, Depot, CategoriePiece, PageParams, extractContent } from '../../shared/models';
import { AuthService } from '../../core/services/auth.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideArchive, LucideArchiveRestore } from '@lucide/angular';

@Component({
  selector: 'app-pieces-detachees',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DecimalPipe, NgClass, AlertComponent, PaginationComponent, SearchableSelectComponent],
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
  private route = inject(ActivatedRoute);

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
    stockMagasin: [null as number | null],
    stockAtelier: [null as number | null],
    prixUnitaire: [null as number | null],
    prixGros: [null as number | null],
    pourcentage: [null as number | null],
    seuilMinimum: [null as number | null],
  });

  stats: PieceStats = { totalArticles: 0, valeurStock: 0, stockCritique: 0, ruptures: 0 };
  excelMenuOpen = false;
  pdfMenuOpen = false;

  toggleExcelMenu(): void {
    if (this.isSuperAgentOrMaster && this.filterType !== 'PDG') {
      this.excelMenuOpen = !this.excelMenuOpen;
      this.pdfMenuOpen = false;
    } else {
      this.exportExcel(false);
    }
  }

  togglePdfMenu(): void {
    if (this.isSuperAgentOrMaster && this.filterType !== 'PDG') {
      this.pdfMenuOpen = !this.pdfMenuOpen;
      this.excelMenuOpen = false;
    } else {
      this.exportPdf(false);
    }
  }

  get totalArticles(): number {
    if (this.filterType === 'PDP') {
      return this.totalElements;
    }
    return this.stats.totalArticles;
  }
  get valeurStock(): number { return this.stats.valeurStock; }
  get stockCritique(): number { return this.stats.stockCritique; }
  get ruptures(): number { return this.stats.ruptures; }

  get canEdit(): boolean {
    const r = this.authService.getRole();
    return r === 'ROLE_SUPER_AGENT' || r === 'ROLE_MASTER' || r === 'ROLE_AGENT_MAGASIN';
  }

  get isSuperAgentOrMaster(): boolean {
    const r = this.authService.getRole();
    return r === 'ROLE_SUPER_AGENT' || r === 'ROLE_MASTER';
  }

  get selectedType(): string {
    return this.form.get('type')?.value ?? 'PDP';
  }

  get tableColumnsCount(): number {
    let count = 2; // Réf, Désignation
    if (this.filterType !== 'PDG') count += 1; // Dépôt
    count += 1; // Catégorie
    count += 3; // Stock magasin, Stock atelier, Qté
    if (this.filterType !== 'PDG' && this.isSuperAgentOrMaster) {
      count += 3; // Prix en gros, Pourcentage, Prix détail
    } else {
      count += 1; // Prix unitaire
    }
    if (this.canEdit) count += 1;
    return count;
  }

  private searchSubject = new Subject<string>();
  private loadTrigger$ = new Subject<void>();

  ngOnInit() {
    this.loadTrigger$.pipe(
      switchMap(() => {
        const params = this.getPageParams();
        return this.service.getAll(params).pipe(
          catchError((err) => {
            console.error('Erreur chargement catalogue:', err);
            return of(null);
          })
        );
      })
    ).subscribe(data => {
      this.loading = false;
      if (data) {
        try {
          const arr = this.applyPageResponse<PieceDetache>(data) || [];
          this.pieces = arr;
          this.filtered = arr;
          if (this.depotsFilters.length === 0) {
            const fromPieces = [...new Set(arr.map((p: any) => p?.depot?.nom || p?.categorie?.depot?.nom || (p as any)?.depotNom).filter((d: any) => !!d))].sort() as string[];
            if (fromPieces.length > 0) this.depotsFilters = fromPieces;
          }
        } catch (err) {
          console.error('Erreur traitement données catalogue:', err);
        }
      } else {
        this.pieces = [];
        this.filtered = [];
      }
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.searchTerm = term;
      this.page = 1;
      this.loadData();
    });

    this.route.data.subscribe(data => {
      if (data && (data['type'] === 'PDP' || data['type'] === 'PDG')) {
        this.filterType = data['type'];
        this.page = 1;
        this.loadData();
      } else {
        this.route.queryParams.subscribe(params => {
          const typeParam = params['type'];
          if (typeParam === 'PDP' || typeParam === 'PDG') {
            this.filterType = typeParam;
          } else if (!typeParam) {
            this.filterType = 'PDP';
          }
          this.page = 1;
          this.loadData();
        });
      }
    });
    this.loadReferences();
    this.loadStats();
    this.setupFormListeners();
  }

  override onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value.trim();
    this.searchSubject.next(val);
  }

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    this.cdr.markForCheck();
    this.loadTrigger$.next();
  }

  getCatNom(p: PieceDetache): string {
    if (!p) return '-';
    if (typeof p.categorie === 'string') return p.categorie;
    return p.categorie?.nom || '-';
  }

  getDepotNom(p: PieceDetache): string {
    if (!p) return '-';
    return p.depot?.nom || p.categorie?.depot?.nom || (typeof p.depot === 'string' ? p.depot : '-');
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

  loadDepots(selectedNom?: string) {
    this.depotService.getAll().subscribe({
      next: (res) => {
        const list = extractContent<Depot>(res) || [];
        this.depots = list;
        this.depotsFilters = [...new Set(list.map(d => d.nom).filter(Boolean))].sort();
        if (selectedNom) {
          const found = this.depots.find(d => d.nom && d.nom.toLowerCase() === selectedNom.toLowerCase());
          if (found?.id) {
            this.form.patchValue({ depotId: found.id });
          }
        } else if (this.isNew && this.filterDepot && this.filterDepot.toUpperCase() !== 'PDG') {
          const depot = this.depots.find(d => d.nom === this.filterDepot);
          if (depot?.id) {
            this.form.patchValue({ depotId: depot.id });
          }
        }
        this.updateFilteredCategories();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement dépôts:', err);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  loadCategories(selectedNom?: string) {
    this.categorieService.getAll().subscribe({
      next: (res) => {
        const list = extractContent<CategoriePiece>(res) || [];
        this.categories = list;
        if (selectedNom) {
          const found = this.categories.find(c => c.nom && c.nom.toLowerCase() === selectedNom.toLowerCase());
          if (found) {
            this.form.patchValue({ categorie: found.nom });
          }
        }
        this.updateFilteredCategories();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur chargement catégories:', err);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  getPhysicalDepotForCategory(catNomOrId: string | number | null | undefined): Depot | null {
    if (!catNomOrId) return null;
    const cat = typeof catNomOrId === 'number'
      ? this.categories.find(c => c.id === catNomOrId)
      : this.categories.find(c => c.nom === catNomOrId);
    if (!cat) return null;

    // 1. Chercher dans cat.depots
    if (cat.depots && Array.isArray(cat.depots) && cat.depots.length > 0) {
      for (const d of cat.depots) {
        const depotId = typeof d === 'object' ? d?.id : d;
        const depotNom = typeof d === 'object' ? d?.nom : (this.depots.find(x => x.id === d)?.nom);
        if (depotNom && depotNom.toUpperCase() !== 'PDG' && depotId) {
          return this.depots.find(x => x.id === depotId) || { id: depotId, nom: depotNom };
        }
      }
    }

    // 2. Chercher dans cat.depotIds
    if (cat.depotIds && Array.isArray(cat.depotIds) && cat.depotIds.length > 0) {
      for (const id of cat.depotIds) {
        const depotObj = this.depots.find(x => x.id === id);
        if (depotObj && depotObj.nom?.toUpperCase() !== 'PDG' && depotObj.id) {
          return depotObj;
        }
      }
    }

    // 3. Chercher dans cat.depot
    const catDepot = cat.depot;
    if (catDepot && catDepot.id) {
      const depotNom = catDepot.nom || this.depots.find(x => x.id === catDepot.id)?.nom;
      if (depotNom && depotNom.toUpperCase() !== 'PDG') {
        return this.depots.find(x => x.id === catDepot.id) || { id: catDepot.id, nom: depotNom };
      }
    }

    // 4. Fallback sur le premier dépôt physique
    return this.physicalDepots[0] || null;
  }

  updateFilteredCategories() {
    const currentDepotId = this.form.get('depotId')?.value;
    if (currentDepotId) {
      const dId = Number(currentDepotId);
      this.filteredCategories = this.categories.filter(c => {
        if (c.depots && Array.isArray(c.depots) && c.depots.length > 0) {
          return c.depots.some((d: any) => (d?.id ?? d) === dId);
        }
        if (c.depotIds && Array.isArray(c.depotIds) && c.depotIds.length > 0) {
          return c.depotIds.includes(dId);
        }
        return c.depot?.id === dId;
      });
    } else {
      this.filteredCategories = this.categories;
    }
    this.cdr.markForCheck();
  }

  get physicalDepots(): Depot[] {
    return this.depots.filter(d => d.nom?.toUpperCase() !== 'PDG');
  }

  setupFormListeners() {
    this.form.get('depotId')?.valueChanges.subscribe(() => {
      this.updateFilteredCategories();
    });

    this.form.get('type')?.valueChanges.subscribe(t => {
      if (t === 'PDG') {
        const pdgDepot = this.depots.find(d => d.nom?.toUpperCase() === 'PDG');
        this.form.patchValue({ depotId: pdgDepot?.id ?? null }, { emitEvent: false });
      } else {
        const currentDepot = this.depots.find(d => d.id === this.form.get('depotId')?.value);
        if (!currentDepot || currentDepot.nom?.toUpperCase() === 'PDG') {
          const catVal = this.form.get('categorie')?.value;
          const physicalDepot = this.getPhysicalDepotForCategory(catVal);
          this.form.patchValue({ depotId: physicalDepot?.id ?? null }, { emitEvent: false });
        }
      }
      this.updateFilteredCategories();
    });

    this.form.get('categorie')?.valueChanges.subscribe(categorieNom => {
      if (categorieNom && this.selectedType === 'PDP') {
        const currentDepotId = this.form.get('depotId')?.value;
        const currentDepot = this.depots.find(d => d.id === currentDepotId);
        // Pour une PDP, si aucun dépôt n'est choisi ou si le dépôt est PDG, assigner l'autre dépôt physique
        if (!currentDepotId || currentDepot?.nom?.toUpperCase() === 'PDG') {
          const physicalDepot = this.getPhysicalDepotForCategory(categorieNom);
          if (physicalDepot?.id) {
            this.form.patchValue({ depotId: physicalDepot.id }, { emitEvent: false });
            this.updateFilteredCategories();
          }
        }
      }
    });

    // Synchronisation automatique des prix pour PDP (SA et Master)
    // Formule : Prix détail = (Prix en gros) + (Prix en gros * (pourcentage / 100))
    const updatePrixDetail = () => {
      const pgVal = this.form.get('prixGros')?.value;
      const pctVal = this.form.get('pourcentage')?.value;
      if (pgVal != null && !isNaN(Number(pgVal))) {
        const pGros = Number(pgVal);
        if (pGros > 0) {
          const pourc = (pctVal != null && !isNaN(Number(pctVal))) ? Number(pctVal) : 0;
          const calcDetail = Math.round(pGros + (pGros * (pourc / 100)));
          this.form.patchValue({ prixUnitaire: calcDetail }, { emitEvent: false });
        }
      }
    };

    this.form.get('prixGros')?.valueChanges.subscribe(() => updatePrixDetail());
    this.form.get('pourcentage')?.valueChanges.subscribe(() => updatePrixDetail());

    this.form.get('prixUnitaire')?.valueChanges.subscribe(pd => {
      const pDetail = Number(pd);
      const pGros = Number(this.form.get('prixGros')?.value);
      if (pGros > 0 && !isNaN(pDetail) && pDetail > 0) {
        const calcPourc = Math.round(((pDetail - pGros) / pGros) * 100);
        this.form.patchValue({ pourcentage: calcPourc }, { emitEvent: false });
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
      extra['depotNom'] = this.filterDepot;
      const dObj = this.depots.find(d => d.nom?.trim().toLowerCase() === this.filterDepot.trim().toLowerCase());
      if (dObj?.id) {
        extra['depotId'] = dObj.id;
      }
    }
    return super.getPageParams(extra);
  }

  applyFilters() {
    this.filtered = [...this.pieces];
  }

  get depotsOptions(): { id?: number | null; nom: string }[] {
    const list: { id?: number | null; nom: string }[] = [{ id: null, nom: 'Tous les dépôts' }];
    this.depots.forEach(d => {
      if (d.nom && !list.some(x => x.nom === d.nom)) {
        list.push({ id: d.id ?? null, nom: d.nom });
      }
    });
    return list;
  }

  onDepotChange(event: any) {
    const val = typeof event === 'object' ? event?.nom : event;
    this.filterDepot = (!val || val === 'Tous les dépôts') ? '' : val;
    this.page = 1;
    this.loadData();
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
    const initialType = this.filterType === 'PDG' ? 'PDG' : 'PDP';
    this.form.reset({ type: initialType });
    this.showModal = true;
    this.loadReferences();
    if (initialType === 'PDG') {
      const pdgDepot = this.depots.find(d => d.nom?.toUpperCase() === 'PDG');
      if (pdgDepot?.id) {
        this.form.patchValue({ depotId: pdgDepot.id });
      }
    } else if (this.filterDepot && this.filterDepot.toUpperCase() !== 'PDG') {
      const depot = this.depots.find(d => d.nom === this.filterDepot);
      if (depot?.id) {
        this.form.patchValue({ depotId: depot.id });
      }
    }
    this.updateFilteredCategories();
  }

  openEdit(p: PieceDetache) {
    this.isNew = false;
    this.editingId = p.id;
    this.errorMessage = '';
    let depotId = (p as any).depot?.id || (p.categorie as any)?.depot?.id || null;
    if (p.type === 'PDP') {
      const currentDepot = this.depots.find(d => d.id === depotId);
      if (!depotId || currentDepot?.nom?.toUpperCase() === 'PDG') {
        const catNom = (p.categorie as any)?.nom || p.categorie;
        const physical = this.getPhysicalDepotForCategory(catNom);
        if (physical?.id) {
          depotId = physical.id;
        }
      }
    }

    this.form.patchValue({
      type: p.type,
      reference: p.reference,
      designation: p.designation,
      categorie: (p.categorie as any)?.nom || p.categorie,
      stockMagasin: p.stockMagasin ?? null,
      stockAtelier: p.stockAtelier ?? null,
      prixUnitaire: p.prixUnitaire ?? p.prix ?? null,
      prixGros: (p as any).prixGros ?? null,
      pourcentage: p.pourcentage ?? null,
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
    const initialType = this.filterType === 'PDG' ? 'PDG' : 'PDP';
    this.form.reset({ type: initialType }); 
  }

  save() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.errorMessage = '';
    const val = this.form.value as any;

    // Validation d'unicité de la référence
    const refExists = this.pieces.some(p => 
      p.reference?.toLowerCase().trim() === val.reference?.toLowerCase().trim() && 
      p.id !== this.editingId
    );
    if (refExists) {
      this.saving = false;
      this.errorMessage = `La référence "${val.reference}" existe déjà dans le catalogue.`;
      return;
    }

    // Validation d'unicité de la désignation
    const desExists = this.pieces.some(p => 
      p.designation?.toLowerCase().trim() === val.designation?.toLowerCase().trim() && 
      p.id !== this.editingId
    );
    if (desExists) {
      this.saving = false;
      this.errorMessage = `La désignation "${val.designation}" existe déjà dans le catalogue.`;
      return;
    }

    let targetDepotId = val.depotId ? Number(val.depotId) : null;
    if (val.type === 'PDP') {
      const currentDepot = this.depots.find(d => d.id === targetDepotId);
      if (!targetDepotId || currentDepot?.nom?.toUpperCase() === 'PDG') {
        const physical = this.getPhysicalDepotForCategory(val.categorie);
        if (physical?.id) {
          targetDepotId = physical.id;
        }
      }
    }

    const payload: any = {
      type: val.type,
      reference: val.reference?.trim(),
      designation: val.designation?.trim(),
      categorie: val.categorie,
    };

    if (targetDepotId) {
      payload.depotId = targetDepotId;
    }

    if (val.type === 'PDP') {
      if (val.stockMagasin != null && !isNaN(Number(val.stockMagasin))) {
        payload.stockMagasin = Number(val.stockMagasin);
      }
      if (val.prixUnitaire != null && !isNaN(Number(val.prixUnitaire))) {
        payload.prixUnitaire = Number(val.prixUnitaire);
      }
      if (val.prixGros != null && !isNaN(Number(val.prixGros))) {
        payload.prixGros = Number(val.prixGros);
      }
      if (val.pourcentage != null && !isNaN(Number(val.pourcentage))) {
        payload.pourcentage = Number(val.pourcentage);
      }
      if (val.seuilMinimum != null && !isNaN(Number(val.seuilMinimum))) {
        payload.seuilMinimum = Number(val.seuilMinimum);
      }
    } else if (val.type === 'PDG') {
      if (val.prixUnitaire != null && !isNaN(Number(val.prixUnitaire))) {
        payload.prixUnitaire = Number(val.prixUnitaire);
      }
    }

    if (this.isNew) {
      this.service.create(payload).subscribe({
        next: (res: any) => {
          if (res) {
            if (typeof res === 'string') {
              this.saving = false;
              this.errorMessage = res;
              this.cdr.markForCheck();
              this.cdr.detectChanges();
              return;
            }
            if (res.data && typeof res.data === 'string') {
              this.saving = false;
              this.errorMessage = res.data;
              this.cdr.markForCheck();
              this.cdr.detectChanges();
              return;
            }
            if (res.success === false || (res.status && res.status >= 400)) {
              this.saving = false;
              this.errorMessage = (typeof res.data === 'string' ? res.data : null) || res.message || 'Une erreur est survenue lors de la création.';
              this.cdr.markForCheck();
              this.cdr.detectChanges();
              return;
            }
          }
          this.saving = false;
          this.showSuccess('Pièce créée avec succès !');
          this.closeModal();
          this.load();
          this.loadStats();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error("Erreur backend:", err);
          this.saving = false;
          const errBody = err.error;
          let msg = '';
          if (typeof errBody === 'string') {
            msg = errBody;
          } else if (errBody?.data && typeof errBody.data === 'string') {
            msg = errBody.data;
          } else if (errBody?.message) {
            msg = errBody.message;
          } else {
            msg = err.message || 'Erreur lors de la création de la pièce.';
          }
          this.errorMessage = msg;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        }
      });
    } else {
      this.service.update(this.editingId!, payload).subscribe({
        next: (res: any) => {
          if (res) {
            if (typeof res === 'string') {
              this.saving = false;
              this.errorMessage = res;
              this.cdr.markForCheck();
              this.cdr.detectChanges();
              return;
            }
            if (res.data && typeof res.data === 'string') {
              this.saving = false;
              this.errorMessage = res.data;
              this.cdr.markForCheck();
              this.cdr.detectChanges();
              return;
            }
            if (res.success === false || (res.status && res.status >= 400)) {
              this.saving = false;
              this.errorMessage = (typeof res.data === 'string' ? res.data : null) || res.message || 'Une erreur est survenue lors de la modification.';
              this.cdr.markForCheck();
              this.cdr.detectChanges();
              return;
            }
          }
          this.saving = false;
          this.showSuccess('Pièce modifiée avec succès !');
          this.closeModal();
          this.load();
          this.loadStats();
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error("Erreur backend:", err);
          this.saving = false;
          const errBody = err.error;
          let msg = '';
          if (typeof errBody === 'string') {
            msg = errBody;
          } else if (errBody?.data && typeof errBody.data === 'string') {
            msg = errBody.data;
          } else if (errBody?.message) {
            msg = errBody.message;
          } else {
            msg = err.message || 'Erreur lors de la modification de la pièce.';
          }
          this.errorMessage = msg;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
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

  exportPdf(avecPrix: boolean = false) {
    if (!this.isSuperAgentOrMaster) {
      avecPrix = false;
    }

    const items = this.filtered;
    const isPdg = this.filterType === 'PDG';
    const title = isPdg ? 'Catalogue des pièces déjà générées (PDG)' : (this.filterType === 'PDP' ? 'Catalogue des pièces détachées (PDP)' : 'Catalogue des pièces détachées');
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    let rowsHtml = '';
    items.forEach((p, idx) => {
      const depotNom = p.depot?.nom || p.categorie?.depot?.nom || '-';
      const catNom = (p.categorie as any)?.nom || p.categorie || '-';
      const rawPrix = p.prixUnitaire ?? p.prix;
      const prixFormatted = rawPrix != null ? new Intl.NumberFormat('fr-FR').format(rawPrix) + ' FCFA' : '—';
      
      rowsHtml += `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 7px 10px; font-weight: 600; color: #0f172a;">${p.reference || '-'}</td>
          <td style="padding: 7px 10px; color: #ef6c1a; font-family: monospace;">${p.numero || '-'}</td>
          <td style="padding: 7px 10px; color: #334155;">${p.designation || '-'}</td>
          <td style="padding: 7px 10px; color: #475569;">${depotNom}</td>
          <td style="padding: 7px 10px; color: #475569;">${catNom}</td>
          ${!isPdg ? `
            <td style="padding: 7px 10px; text-align: center; color: #0f172a;">${p.stockMagasin ?? 0}</td>
            <td style="padding: 7px 10px; text-align: center; color: #0f172a;">${p.stockAtelier ?? 0}</td>
            <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: #0f172a;">${p.qteReelle ?? 0}</td>
          ` : ''}
          ${avecPrix && !isPdg ? `
            <td style="padding: 7px 10px; text-align: right; font-weight: 600; color: #0f172a;">${prixFormatted}</td>
          ` : ''}
        </tr>
      `;
    });

    const filterInfo = [
      this.filterDepot ? `Dépôt: <b>${this.filterDepot}</b>` : 'Tous les dépôts',
      this.filterStatut ? `Statut: <b>${this.filterStatut}</b>` : 'Tous statuts',
      `Nombre d'articles: <b>${items.length}</b>`,
      avecPrix ? 'Mode: <b>Avec prix</b>' : 'Mode: <b>Sans prix</b>'
    ].join(' &nbsp;|&nbsp; ');

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4 ${avecPrix || !isPdg ? 'landscape' : 'portrait'};
            margin: 10mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 10px;
            font-size: 11px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #ef6c1a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .logo {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.5px;
          }
          .logo span {
            color: #ef6c1a;
          }
          .title {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 6px 0;
          }
          .meta {
            font-size: 10px;
            color: #64748b;
            text-align: right;
          }
          .filters-bar {
            background-color: #f1f5f9;
            padding: 6px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            font-size: 10.5px;
            color: #334155;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th {
            background-color: #0f1e36;
            color: #ffffff;
            font-weight: 700;
            padding: 7px 10px;
            text-align: left;
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">OAS <span>• Orient Auto Service</span></div>
          <div class="meta">Édité le : <b>${dateStr}</b></div>
        </div>

        <h2 class="title">${title}</h2>
        <div class="filters-bar">${filterInfo}</div>

        <table>
          <thead>
            <tr>
              <th>Réf</th>
              <th>Numéro</th>
              <th>Désignation</th>
              <th>Dépôt</th>
              <th>Catégorie</th>
              ${!isPdg ? `
                <th style="text-align: center;">Stock Mag.</th>
                <th style="text-align: center;">Stock Atel.</th>
                <th style="text-align: center;">Qté Totale</th>
              ` : ''}
              ${avecPrix && !isPdg ? `
                <th style="text-align: right;">Prix Unitaire</th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          Document généré par OAS Facturation — Total des articles : ${items.length}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 350);
    }
  }

  exportExcel(avecPrix: boolean = false) {
    if (!this.isSuperAgentOrMaster) {
      avecPrix = false;
    }

    const items = this.filtered;
    const isPdg = this.filterType === 'PDG';
    
    let headers: string[] = [];
    if (isPdg) {
      headers = ['Référence', 'Numéro', 'Désignation', 'Dépôt', 'Catégorie', 'Statut'];
    } else if (avecPrix) {
      headers = ['Référence', 'Numéro', 'Désignation', 'Dépôt', 'Catégorie', 'Stock Magasin', 'Stock Atelier', 'Quantité Réelle', 'Prix Unitaire (FCFA)', 'Statut'];
    } else {
      headers = ['Référence', 'Numéro', 'Désignation', 'Dépôt', 'Catégorie', 'Stock Magasin', 'Stock Atelier', 'Quantité Réelle', 'Statut'];
    }

    const rows = items.map(p => {
      const depotNom = p.depot?.nom || p.categorie?.depot?.nom || '';
      const catNom = (p.categorie as any)?.nom || p.categorie || '';
      if (isPdg) {
        return [
          p.reference || '',
          p.numero || '',
          p.designation || '',
          depotNom,
          catNom,
          p.statut || ''
        ];
      } else if (avecPrix) {
        return [
          p.reference || '',
          p.numero || '',
          p.designation || '',
          depotNom,
          catNom,
          p.stockMagasin != null ? p.stockMagasin : 0,
          p.stockAtelier != null ? p.stockAtelier : 0,
          p.qteReelle != null ? p.qteReelle : 0,
          (p.prixUnitaire ?? p.prix) != null ? (p.prixUnitaire ?? p.prix) : 0,
          p.statut || ''
        ];
      } else {
        return [
          p.reference || '',
          p.numero || '',
          p.designation || '',
          depotNom,
          catNom,
          p.stockMagasin != null ? p.stockMagasin : 0,
          p.stockAtelier != null ? p.stockAtelier : 0,
          p.qteReelle != null ? p.qteReelle : 0,
          p.statut || ''
        ];
      }
    });

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filePrefix = isPdg ? 'pieces_generees_pdg' : 'pieces_detachees_pdp';
    const priceSuffix = avecPrix ? 'avec_prix' : 'sans_prix';
    link.setAttribute('download', `${filePrefix}_${priceSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Quick-Add Dépôt
  showQuickDepotModal = false;
  quickDepotNom = '';
  quickDepotDescription = '';
  quickDepotSaving = false;
  quickDepotError = '';

  openQuickAddDepot() {
    this.quickDepotNom = '';
    this.quickDepotDescription = '';
    this.quickDepotError = '';
    this.quickDepotSaving = false;
    this.showQuickDepotModal = true;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  closeQuickAddDepot() {
    this.showQuickDepotModal = false;
    this.quickDepotError = '';
    this.quickDepotSaving = false;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  saveQuickDepot() {
    const nom = this.quickDepotNom.trim();
    if (!nom || this.quickDepotSaving) return;
    if (nom.toUpperCase() === 'PDG') {
      this.quickDepotError = 'Le nom "PDG" est réservé pour le dépôt PDG.';
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      return;
    }
    const exists = this.depots.some(d => d.nom && d.nom.toLowerCase() === nom.toLowerCase());
    if (exists) {
      this.quickDepotError = `Le dépôt "${nom}" existe déjà.`;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      return;
    }

    this.quickDepotSaving = true;
    this.quickDepotError = '';
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    const payload: any = {
      nom: nom,
      description: this.quickDepotDescription.trim() || ''
    };

    this.depotService.create(payload).subscribe({
      next: (createdRes: any) => {
        const created = (createdRes as any)?.data ?? createdRes;
        this.quickDepotSaving = false;
        this.showQuickDepotModal = false;
        this.quickDepotNom = '';
        this.quickDepotDescription = '';
        this.showSuccess(`Dépôt "${nom}" créé avec succès !`);

        if (created?.id) {
          const newD: Depot = { id: created.id, nom: created.nom || nom, description: created.description };
          if (!this.depots.some(d => d.id === newD.id)) {
            this.depots = [...this.depots, newD];
          }
          this.form.patchValue({ depotId: newD.id });
        }

        this.loadDepots(nom);
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erreur création dépôt:', err);
        this.quickDepotSaving = false;
        this.quickDepotError = typeof err.error === 'string' ? err.error : (err.error?.message || 'Erreur lors de la création du dépôt.');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  // Quick-Add Catégorie
  showQuickCatModal = false;
  quickCatNom = '';
  quickCatDepotId: number | null = null;
  quickCatSaving = false;
  quickCatError = '';

  openQuickAddCategorie() {
    this.quickCatNom = '';
    this.quickCatError = '';
    this.quickCatSaving = false;
    // Pré-sélectionner le dépôt courant
    let currentDepotId = this.form.get('depotId')?.value;
    if (this.selectedType === 'PDG') {
      const pdg = this.depots.find(d => d.nom?.toUpperCase() === 'PDG');
      currentDepotId = pdg?.id ?? null;
    } else if (!currentDepotId) {
      currentDepotId = this.physicalDepots[0]?.id ?? null;
    }
    this.quickCatDepotId = currentDepotId;
    this.showQuickCatModal = true;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  closeQuickAddCategorie() {
    this.showQuickCatModal = false;
    this.quickCatError = '';
    this.quickCatSaving = false;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  saveQuickCategorie() {
    const nom = this.quickCatNom.trim();
    if (!nom || this.quickCatSaving) return;
    const exists = this.categories.some(c => c.nom && c.nom.toLowerCase() === nom.toLowerCase());
    if (exists) {
      this.quickCatError = `La catégorie "${nom}" existe déjà.`;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      return;
    }

    this.quickCatSaving = true;
    this.quickCatError = '';
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    const dId = this.quickCatDepotId;
    const payload: any = {
      nom: nom,
    };
    if (dId) {
      payload.depotId = Number(dId);
      payload.depotIds = [Number(dId)];
    }

    this.categorieService.create(payload).subscribe({
      next: (createdRes: any) => {
        const created = (createdRes as any)?.data ?? createdRes;
        this.quickCatSaving = false;
        this.showQuickCatModal = false;
        this.quickCatNom = '';
        this.showSuccess(`Catégorie "${nom}" créée avec succès !`);

        const newCat: CategoriePiece = {
          id: created?.id,
          nom: created?.nom || nom,
          depot: dId ? { id: Number(dId) } : undefined,
          depotIds: dId ? [Number(dId)] : undefined
        };
        if (!this.categories.some(c => c.nom && c.nom.toLowerCase() === nom.toLowerCase())) {
          this.categories = [...this.categories, newCat];
        }
        this.form.patchValue({ categorie: nom });
        if (dId && !this.form.get('depotId')?.value && this.selectedType === 'PDP') {
          this.form.patchValue({ depotId: Number(dId) });
        }

        this.loadCategories(nom);
        this.updateFilteredCategories();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erreur création catégorie:', err);
        this.quickCatSaving = false;
        this.quickCatError = typeof err.error === 'string' ? err.error : (err.error?.message || 'Erreur lors de la création de la catégorie.');
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get f() { return this.form.controls; }
}
