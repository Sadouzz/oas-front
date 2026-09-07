import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FournisseurService } from './fournisseur.service';
import { FournisseurModel } from '../../shared/models/index';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideBuilding2, LucideArchive, LucideArchiveRestore, LucideLoader2 } from '@lucide/angular';

@Component({
  selector: 'app-fournisseurs',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, PaginationComponent, LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideBuilding2, LucideArchive, LucideArchiveRestore, LucideLoader2],
  templateUrl: './fournisseurs.component.html',
})
export class FournisseursComponent extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private service = inject(FournisseurService);

  fournisseurs: FournisseurModel[] = [];
  filtered: FournisseurModel[] = [];
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showModal = false;
  isNew = false;
  editingId: number | null = null;

  form = this.fb.group({
    nomEntreprise: ['', Validators.required],
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
  });

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getAll(this.getPageParams()).subscribe({
      next: (res) => {
        const list = this.applyPageResponse<FournisseurModel>(res);
        this.fournisseurs = list;
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.fournisseurs = [];
        this.filtered = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilter() {
    let data = this.fournisseurs;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(f =>
        f.nomEntreprise?.toLowerCase().includes(term) ||
        f.matricule?.toLowerCase().includes(term) ||
        `${f.prenom ?? ''} ${f.nom ?? ''}`.toLowerCase().includes(term)
      );
    }
    this.filtered = data;
  }

  // onSearch is inherited from BasePaginatedComponent

  get paged(): FournisseurModel[] {
    return this.filtered;
  }

  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset();
    this.showModal = true;
  }

  openEdit(f: FournisseurModel) {
    this.isNew = false;
    this.editingId = f.id;
    this.form.patchValue({ nomEntreprise: f.nomEntreprise, nom: f.nom, prenom: f.prenom });
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
      error: (err: any) => { 
        console.error("Erreur backend:", err);
        this.saving = false; 
        this.errorMessage = typeof err.error === 'string' ? err.error : (err.error?.message || 'Erreur.'); 
      }
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
