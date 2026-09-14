import { Component, inject, OnInit, OnDestroy, Pipe, PipeTransform, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, NgClass, UpperCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MainDoeuvreService } from './main-doeuvre.service';
import { CategorieMainDoeuvreService } from './categorie-main-doeuvre.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { MainDoeuvreModel, MainDoeuvreRequest, CategorieMainDoeuvreModel, extractContent, extractPage } from '../../shared/models';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideArchive, LucideArchiveRestore, LucideLoader2 } from '@lucide/angular';

// Pipe inline pour compter par catégorie dans le template
@Pipe({ name: 'categorieCount', standalone: true, pure: false })
export class CategorieCountPipe implements PipeTransform {
  private cdr = inject(ChangeDetectorRef);
  transform(items: MainDoeuvreModel[], catId: number): number {
    return (Array.isArray(items) ? items : []).filter(i => i.categorie?.id === catId).length;
  }
}

@Component({
  selector: 'app-main-doeuvre',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, NgClass, UpperCasePipe, AlertComponent, PaginationComponent, CategorieCountPipe],
  templateUrl: './main-doeuvre.component.html',
})
export class MainDoeuvreComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private fb      = inject(FormBuilder);
  private service = inject(MainDoeuvreService);
  private catService = inject(CategorieMainDoeuvreService);

  items:    MainDoeuvreModel[] = [];
  categories: CategorieMainDoeuvreModel[] = [];
  page = 1;
  readonly pageSize = 10;
  totalElements = 0;
  totalPages = 1;
  loading = false;
  saving  = false;
  successMessage = '';
  errorMessage   = '';

  filterCategorieId: number | null = null;
  filterArchived  = 'actif';   // 'actif' | 'archive' | 'tous'
  searchTerm      = '';
  private searchTimeout: any;

  // Modal Main Doeuvre
  showModal = false;
  isNew     = false;
  editingId: number | null = null;

  form = this.fb.group({
    categorieId: [null as number | null, Validators.required],
    description: [''],
    prix:      [null as number | null, [Validators.required, Validators.min(0)]],
    nbreHeure: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  // Modal Categories
  showCatModal = false;
  editingCatId: number | null = null;
  savingCat = false;
  catErrorMessage = '';
  catForm = this.fb.group({
    nom: ['', Validators.required]
  });

  ngOnInit() { 
    this.loadCategories();
    this.load(); 
  }

  ngOnDestroy() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  loadCategories() {
    this.catService.getAll().subscribe({
      next: (data) => this.categories = extractContent(data),
      error: () => this.errorMessage = 'Erreur lors du chargement des catégories'
    });
  }

  load() {
    this.loading = true;
    this.cdr.markForCheck();

    const params: any = {
      page: this.page - 1,
      size: this.pageSize
    };

    if (this.searchTerm?.trim()) {
      params.keyword = this.searchTerm.trim();
    }

    if (this.filterCategorieId) {
      params.categorieId = this.filterCategorieId;
    }

    if (this.filterArchived === 'actif') {
      params.isArchived = false;
      params.archived = false;
    } else if (this.filterArchived === 'archive') {
      params.isArchived = true;
      params.archived = true;
    }

    this.service.getAll(params).subscribe({
      next: (data) => {
        const list = extractContent<MainDoeuvreModel>(data);
        const pageInfo = extractPage<MainDoeuvreModel>(data);

        if (pageInfo) {
          this.items = list;
          this.totalElements = pageInfo.totalElements ?? list.length;
          this.totalPages = pageInfo.totalPages ?? Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        } else if (data && data.totalElements !== undefined) {
          this.items = list;
          this.totalElements = data.totalElements;
          this.totalPages = data.totalPages ?? Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        } else {
          let filtered = list;
          if (this.searchTerm?.trim()) {
            const kw = this.searchTerm.trim().toLowerCase();
            filtered = filtered.filter(i => 
              (i.description && i.description.toLowerCase().includes(kw)) ||
              (i.categorie?.nom && i.categorie.nom.toLowerCase().includes(kw))
            );
          }
          if (this.filterCategorieId) {
            filtered = filtered.filter(i => i.categorie?.id === this.filterCategorieId);
          }
          if (this.filterArchived === 'actif') {
            filtered = filtered.filter(i => !i.isArchived);
          } else if (this.filterArchived === 'archive') {
            filtered = filtered.filter(i => i.isArchived);
          }
          this.totalElements = filtered.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
          this.items = filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
        }

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.items = [];
        this.totalElements = 0;
        this.totalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.load();
    }, 300);
  }

  onCategorieFilter(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterCategorieId = val ? +val : null;
    this.page = 1;
    this.load();
  }

  onArchivedFilter(event: Event) {
    this.filterArchived = (event.target as HTMLSelectElement).value;
    this.page = 1;
    this.load();
  }

  filterByCategorie(catId: number) {
    this.filterCategorieId = this.filterCategorieId === catId ? null : catId;
    this.page = 1;
    this.load();
  }

  // ── Pagination ────────────────────────────────────────
  onPageChange(newPage: number) {
    this.page = newPage;
    this.load();
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.load();
    }
  }

  // ── CRUD MAIN D'OEUVRE ────────────────────────────────
  openCreate() {
    this.isNew = true; this.editingId = null;
    this.form.reset();
    this.errorMessage = '';
    this.showModal = true;
  }

  openEdit(item: MainDoeuvreModel) {
    this.isNew = false; this.editingId = item.id;
    this.form.patchValue({ categorieId: item.categorie?.id, description: item.description, prix: item.prix, nbreHeure: item.nbreHeure });
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.form.reset(); this.errorMessage = ''; }

  save() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const { categorieId, description, prix, nbreHeure } = this.form.getRawValue();
    const payload: MainDoeuvreRequest = { categorieId: categorieId!, description: description!, prix: prix!, nbreHeure: nbreHeure! };
    const obs = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    obs.subscribe({
      next: () => { this.saving = false; this.showSuccess(this.isNew ? 'Prestation créée !' : 'Prestation modifiée !'); this.closeModal(); this.load(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de l\'enregistrement.'; }
    });
  }

  toggleArchive(item: MainDoeuvreModel) {
    this.service.setArchived(item.id, !item.isArchived).subscribe({
      next: () => { this.showSuccess(item.isArchived ? 'Prestation désarchivée.' : 'Prestation archivée.'); this.load(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  delete(item: MainDoeuvreModel) {
    if (!confirm(`Supprimer "${item.categorie?.nom}" (${item.nbreHeure}h — ${item.prix.toLocaleString('fr-FR')} FCFA) ? Action irréversible.`)) return;
    this.service.delete(item.id).subscribe({
      next: () => { this.showSuccess('Prestation supprimée.'); this.load(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la suppression.'; }
    });
  }

  // ── CRUD CATEGORIE ────────────────────────────────────
  openCatModal() {
    this.showCatModal = true;
    this.editingCatId = null;
    this.catForm.reset();
    this.catErrorMessage = '';
  }

  closeCatModal() {
    this.showCatModal = false;
  }

  editCat(cat: CategorieMainDoeuvreModel) {
    this.editingCatId = cat.id;
    this.catForm.patchValue({ nom: cat.nom });
  }

  cancelEditCat() {
    this.editingCatId = null;
    this.catForm.reset();
  }

  saveCat() {
    if (this.catForm.invalid || this.savingCat) { this.catForm.markAllAsTouched(); return; }
    this.savingCat = true;
    const req = { nom: this.catForm.value.nom! };
    const obs = this.editingCatId 
      ? this.catService.update(this.editingCatId, req)
      : this.catService.create(req);
    
    obs.subscribe({
      next: () => {
        this.savingCat = false;
        this.catErrorMessage = '';
        this.showCatModal = false;
        this.editingCatId = null;
        this.catForm.reset();
        this.showSuccess('Catégorie enregistrée !');
        this.loadCategories();
      },
      error: (err: any) => {
        this.savingCat = false;
        this.catErrorMessage = err.error?.message || 'Erreur lors de l\'enregistrement de la catégorie.';
      }
    });
  }

  deleteCat(id: number) {
    if (!confirm('Supprimer cette catégorie ?')) return;
    this.catService.delete(id).subscribe({
      next: () => { this.loadCategories(); this.showSuccess('Catégorie supprimée'); },
      error: (err) => this.catErrorMessage = err.error?.message || 'Erreur lors de la suppression'
    });
  }

  // ── Labels & styles ───────────────────────────────────
  categorieBgIcon(c: string | undefined): string {
    const nom = c?.toUpperCase() || '';
    if (nom.includes('MEC')) return 'bg-oas-info-bg';
    if (nom.includes('CAR') || nom.includes('TOL')) return 'bg-oas-accent-bg';
    if (nom.includes('ELEC')) return 'bg-oas-warn-bg';
    if (nom.includes('PEIN')) return 'bg-oas-ok-bg';
    return 'bg-oas-bg';
  }

  categorieIconColor(c: string | undefined): string {
    const nom = c?.toUpperCase() || '';
    if (nom.includes('MEC')) return 'text-oas-info';
    if (nom.includes('CAR') || nom.includes('TOL')) return 'text-oas-accent';
    if (nom.includes('ELEC')) return 'text-oas-warn';
    if (nom.includes('PEIN')) return 'text-oas-ok';
    return 'text-oas-muted';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get fc() { return this.form.controls; }
  get cfc() { return this.catForm.controls; }
}
