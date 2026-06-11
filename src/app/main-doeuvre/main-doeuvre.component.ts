import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MainDoeuvreService, MainDoeuvreModel, CategorieMainDoeuvre, MainDoeuvreRequest } from '../services/main-doeuvre.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-main-doeuvre',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, AlertComponent, PaginationComponent],
  templateUrl: './main-doeuvre.component.html',
})
export class MainDoeuvreComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(MainDoeuvreService);

  items: MainDoeuvreModel[] = [];
  filtered: MainDoeuvreModel[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  filterCategorie = '';
  searchTerm = '';

  showModal = false;
  isNew = false;
  editingId: number | null = null;

  readonly categories: CategorieMainDoeuvre[] = ['MECANIQUE', 'CARROSSERIE', 'ELECTRIQUE', 'PEINTURE'];

  form = this.fb.group({
    categorie: ['MECANIQUE' as CategorieMainDoeuvre, Validators.required],
    prix: [null as number | null, [Validators.required, Validators.min(0)]],
    nbreHeure: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { this.items = data; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    let data = this.items;
    if (this.filterCategorie) data = data.filter(i => i.categorie === this.filterCategorie);
    if (this.searchTerm) {
      const kw = this.searchTerm;
      data = data.filter(i => i.categorie.toLowerCase().includes(kw));
    }
    this.filtered = data;
    this.page = 1;
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  onCategorieFilter(event: Event) {
    this.filterCategorie = (event.target as HTMLSelectElement).value;
    this.applyFilter();
  }

  get paged(): MainDoeuvreModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset({ categorie: 'MECANIQUE' });
    this.showModal = true;
  }

  openEdit(item: MainDoeuvreModel) {
    this.isNew = false;
    this.editingId = item.id;
    this.form.patchValue({ categorie: item.categorie, prix: item.prix, nbreHeure: item.nbreHeure });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.form.reset({ categorie: 'MECANIQUE' }); this.errorMessage = ''; }

  save() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const { categorie, prix, nbreHeure } = this.form.getRawValue();
    const payload: MainDoeuvreRequest = { categorie: categorie!, prix: prix!, nbreHeure: nbreHeure! };
    const obs = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    obs.subscribe({
      next: () => { this.saving = false; this.showSuccess(this.isNew ? 'Prestation créée !' : 'Prestation modifiée !'); this.closeModal(); this.load(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  toggleArchive(item: MainDoeuvreModel) {
    this.service.setArchived(item.id, !item.isArchived).subscribe({
      next: () => { this.showSuccess(item.isArchived ? 'Prestation désarchivée.' : 'Prestation archivée.'); this.load(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  delete(item: MainDoeuvreModel) {
    if (!confirm(`Supprimer cette prestation (${item.categorie} — ${item.nbreHeure}h) ? Cette action est irréversible.`)) return;
    this.service.delete(item.id).subscribe({
      next: () => { this.showSuccess('Prestation supprimée.'); this.load(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la suppression.'; }
    });
  }

  categorieLabel(c: string): string {
    const labels: Record<string, string> = {
      MECANIQUE: 'Mécanique',
      CARROSSERIE: 'Carrosserie',
      ELECTRIQUE: 'Électrique',
      PEINTURE: 'Peinture',
    };
    return labels[c] ?? c;
  }

  categorieBadge(c: string): string {
    const classes: Record<string, string> = {
      MECANIQUE: 'bg-oas-info-bg text-oas-info',
      CARROSSERIE: 'bg-oas-accent-bg text-oas-accent',
      ELECTRIQUE: 'bg-oas-warn-bg text-oas-warn',
      PEINTURE: 'bg-oas-ok-bg text-oas-ok',
    };
    return classes[c] ?? 'bg-oas-bg text-oas-muted';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get fc() { return this.form.controls; }
}
