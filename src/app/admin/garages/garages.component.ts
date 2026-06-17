import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { GarageService } from '../../services/garage.service';
import { Garage } from '../../shared/models';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideBuilding2 } from '@lucide/angular';

@Component({
  selector: 'app-garages',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, PaginationComponent, LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideBuilding2],
  templateUrl: './garages.component.html',
})
export class GaragesComponent implements OnInit {
  private service = inject(GarageService);
  private fb = inject(FormBuilder);

  garages: Garage[] = [];
  filtered: Garage[] = [];
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
    libelle: ['', Validators.required],
    ville: ['', Validators.required],
    adresse: [''],
    contact: [''],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.garages = data; this.filtered = data; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  onSearch(e: Event) {
    const kw = (e.target as HTMLInputElement).value.toLowerCase();
    this.filtered = this.garages.filter(g =>
      g.libelle.toLowerCase().includes(kw) ||
      g.ville.toLowerCase().includes(kw) ||
      (g.adresse ?? '').toLowerCase().includes(kw)
    );
    this.page = 1;
  }

  openNew() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset();
    this.showModal = true;
  }

  openEdit(g: Garage) {
    this.isNew = false;
    this.editingId = g.id;
    this.form.patchValue({ libelle: g.libelle, ville: g.ville, adresse: g.adresse, contact: g.contact });
    this.showModal = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const payload = this.form.value;
    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    req$.subscribe({
      next: () => { this.showModal = false; this.load(); this.notify('Garage enregistré.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la sauvegarde.'); },
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce garage ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.notify('Garage supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  get paged(): Garage[] {
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
