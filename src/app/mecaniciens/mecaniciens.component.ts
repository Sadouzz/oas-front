import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MecanicienService } from '../services/mecanicien.service';
import { Mecanicien } from '../shared/models';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideUser, LucideWrench } from '@lucide/angular';

@Component({
  selector: 'app-mecaniciens',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, PaginationComponent, LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX],
  templateUrl: './mecaniciens.component.html',
})
export class MecaniciensComponent implements OnInit {
  private service = inject(MecanicienService);
  private fb = inject(FormBuilder);

  mecaniciens: Mecanicien[] = [];
  filtered: Mecanicien[] = [];
  loading = true;
  saving = false;
  showModal = false;
  isNew = true;
  editingId: number | null = null;
  page = 1;
  pageSize = 10;
  successMessage = '';
  errorMessage = '';

  form: FormGroup = this.fb.group({
    nom: ['', Validators.required],
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.mecaniciens = data; this.filtered = data; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  onSearch(e: Event) {
    const kw = (e.target as HTMLInputElement).value.toLowerCase();
    this.filtered = this.mecaniciens.filter(m => m.nom.toLowerCase().includes(kw));
    this.page = 1;
  }

  openNew() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset();
    this.showModal = true;
  }

  openEdit(m: Mecanicien) {
    this.isNew = false;
    this.editingId = m.id;
    this.form.patchValue({ nom: m.nom });
    this.showModal = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const raw = this.form.value;
    const payload = { nom: raw.nom };
    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    req$.subscribe({
      next: () => { this.showModal = false; this.load(); this.notify('Mécanicien enregistré.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la sauvegarde.'); },
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce mécanicien ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.notify('Mécanicien supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  get paged(): Mecanicien[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }

  private notify(msg: string) {
    this.saving = false;
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.saving = false;
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
