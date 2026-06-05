import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FournisseurService, FournisseurModel } from '../services/fournisseur.service';

@Component({
  selector: 'app-fournisseurs',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './fournisseurs.component.html',
})
export class FournisseursComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(FournisseurService);

  fournisseurs: FournisseurModel[] = [];
  filtered: FournisseurModel[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';
  keyword = '';
  statusFilter: 'all' | 'active' | 'archived' = 'all';

  showModal = false;
  isNew = false;
  editingId: number | null = null;

  form = this.fb.group({
    matricule: [{ value: '', disabled: true }, Validators.required],
    nomEntreprise: ['', Validators.required],
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => { this.fournisseurs = data; this.applyFilters(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onSearch(event: Event) {
    this.keyword = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilters();
  }

  setStatusFilter(f: 'all' | 'active' | 'archived') {
    this.statusFilter = f;
    this.applyFilters();
  }

  private applyFilters() {
    let result = this.fournisseurs;
    if (this.statusFilter === 'active')   result = result.filter(f => !f.archived);
    if (this.statusFilter === 'archived') result = result.filter(f => f.archived);
    if (this.keyword) {
      result = result.filter(f =>
        f.nomEntreprise.toLowerCase().includes(this.keyword) ||
        f.matricule.toLowerCase().includes(this.keyword) ||
        `${f.prenom} ${f.nom}`.toLowerCase().includes(this.keyword)
      );
    }
    this.filtered = result;
    this.page = 1;
  }

  get paged(): FournisseurModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get rangeEnd(): number { return Math.min(this.page * this.pageSize, this.filtered.length); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset();
    this.form.patchValue({ matricule: this.nextMatricule('FRN', this.fournisseurs) });
    this.showModal = true;
  }

  private nextMatricule(prefix: string, list: { matricule?: string }[]): string {
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    const nums = list.map(i => i.matricule ?? '').map(m => { const match = m.match(re); return match ? parseInt(match[1], 10) : 0; }).filter(n => n > 0);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `${prefix}-${String(next).padStart(5, '0')}`;
  }

  openEdit(f: FournisseurModel) {
    this.isNew = false;
    this.editingId = f.id;
    this.form.patchValue({ matricule: f.matricule, nomEntreprise: f.nomEntreprise, nom: f.nom, prenom: f.prenom });
    this.showModal = true;
  }

  closeModal() { this.showModal = false; this.form.reset(); this.errorMessage = ''; }

  save() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const payload = this.form.getRawValue() as any;
    const obs = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    obs.subscribe({
      next: () => { this.saving = false; this.showSuccess(this.isNew ? 'Fournisseur créé !' : 'Fournisseur modifié !'); this.closeModal(); this.load(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  archive(f: FournisseurModel) {
    this.service.archive(f.id).subscribe({
      next: () => { this.showSuccess('Fournisseur archivé.'); this.load(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  unarchive(f: FournisseurModel) {
    this.service.unarchive(f.id).subscribe({
      next: () => { this.showSuccess('Fournisseur désarchivé.'); this.load(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  delete(f: FournisseurModel) {
    if (!confirm(`Supprimer le fournisseur "${f.nomEntreprise}" ? Cette action est irréversible.`)) return;
    this.service.delete(f.id).subscribe({
      next: () => { this.showSuccess('Fournisseur supprimé.'); this.load(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la suppression.'; }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get f() { return this.form.controls; }
}
