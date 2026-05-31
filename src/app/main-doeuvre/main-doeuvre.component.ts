import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MainDoeuvreService, MainDoeuvreModel, CategorieMainDoeuvre } from '../services/main-doeuvre.service';

@Component({
  selector: 'app-main-doeuvre',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
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
      next: (data) => { this.items = data; this.filtered = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.filtered = term
      ? this.items.filter(i => i.categorie.toLowerCase().includes(term))
      : this.items;
    this.page = 1;
  }

  get paged(): MainDoeuvreModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get rangeEnd(): number { return Math.min(this.page * this.pageSize, this.filtered.length); }
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
    const payload = { ...this.form.value, isArchived: false };
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
      MECANIQUE: 'bg-blue-100 text-blue-800',
      CARROSSERIE: 'bg-orange-100 text-orange-800',
      ELECTRIQUE: 'bg-yellow-100 text-yellow-800',
      PEINTURE: 'bg-purple-100 text-purple-800',
    };
    return classes[c] ?? 'bg-gray-100 text-gray-700';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get fc() { return this.form.controls; }
}
