import { Component, inject, OnInit, Pipe, PipeTransform } from '@angular/core';
import { DecimalPipe, NgClass, UpperCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MainDoeuvreService, MainDoeuvreModel, MainDoeuvreRequest } from '../services/main-doeuvre.service';
import { CategorieMainDoeuvreService, CategorieMainDoeuvreModel } from '../services/categorie-main-doeuvre.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

// Pipe inline pour compter par catégorie dans le template
@Pipe({ name: 'categorieCount', standalone: true, pure: false })
export class CategorieCountPipe implements PipeTransform {
  transform(items: MainDoeuvreModel[], catId: number): number {
    return items.filter(i => i.categorie?.id === catId).length;
  }
}

@Component({
  selector: 'app-main-doeuvre',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, NgClass, UpperCasePipe, AlertComponent, PaginationComponent, CategorieCountPipe],
  templateUrl: './main-doeuvre.component.html',
})
export class MainDoeuvreComponent implements OnInit {
  private fb      = inject(FormBuilder);
  private service = inject(MainDoeuvreService);
  private catService = inject(CategorieMainDoeuvreService);

  items:    MainDoeuvreModel[] = [];
  filtered: MainDoeuvreModel[] = [];
  categories: CategorieMainDoeuvreModel[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;
  saving  = false;
  successMessage = '';
  errorMessage   = '';

  filterCategorieId: number | null = null;
  filterArchived  = 'actif';   // 'actif' | 'archive' | 'tous'
  searchTerm      = '';

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

  loadCategories() {
    this.catService.getAll().subscribe({
      next: (data) => this.categories = data,
      error: () => this.errorMessage = 'Erreur lors du chargement des catégories'
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { this.items = data.sort((a:any, b:any) => b.id - a.id); this.applyFilter(); this.loading = false; },
      error: ()    => { this.loading = false; }
    });
  }

  applyFilter() {
    let data = this.items;
    // Filtre archivé
    if (this.filterArchived === 'actif')   data = data.filter(i => !i.isArchived);
    if (this.filterArchived === 'archive') data = data.filter(i =>  i.isArchived);
    // Filtre catégorie
    if (this.filterCategorieId) data = data.filter(i => i.categorie?.id === this.filterCategorieId);
    // Recherche texte
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      data = data.filter(i => i.categorie?.nom?.toLowerCase().includes(kw));
    }
    this.filtered = data;
    this.page = 1;
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  onCategorieFilter(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterCategorieId = val ? +val : null;
    this.applyFilter();
  }

  onArchivedFilter(event: Event) {
    this.filterArchived = (event.target as HTMLSelectElement).value;
    this.applyFilter();
  }

  filterByCategorie(catId: number) {
    this.filterCategorieId = this.filterCategorieId === catId ? null : catId;
    this.applyFilter();
  }

  // ── Pagination ────────────────────────────────────────
  get paged(): MainDoeuvreModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

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
        this.editingCatId = null;
        this.catForm.reset();
        this.loadCategories();
        this.showSuccess('Catégorie enregistrée');
      },
      error: (err) => {
        this.savingCat = false;
        this.catErrorMessage = err.error?.message || 'Erreur d\'enregistrement de la catégorie';
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
