import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FicheAtelierService, FicheAtelier } from '../services/fiche-atelier.service';
import { VehiculeService, VehiculeModel } from '../services/vehicule.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-fiches-atelier',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, PaginationComponent],
  templateUrl: './fiches-atelier.component.html',
})
export class FichesAtelierComponent implements OnInit {
  private service = inject(FicheAtelierService);
  private vehiculeService = inject(VehiculeService);
  private fb = inject(FormBuilder);

  fiches: FicheAtelier[] = [];
  filtered: FicheAtelier[] = [];
  vehicules: VehiculeModel[] = [];
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
    numero: ['', Validators.required],
    descriptionTravaux: ['', Validators.required],
    listeReception: [''],
    listeDefauts: [''],
    vehiculeId: [null, Validators.required],
    dateSortie: [''],
  });

  ngOnInit() {
    this.load();
    this.vehiculeService.getAll().subscribe({ next: v => this.vehicules = v });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.fiches = data; this.filtered = data; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  onSearch(e: Event) {
    const kw = (e.target as HTMLInputElement).value.toLowerCase();
    this.filtered = this.fiches.filter(f =>
      f.numero.toLowerCase().includes(kw) ||
      (f.vehicule?.immatriculation ?? '').toLowerCase().includes(kw) ||
      f.descriptionTravaux.toLowerCase().includes(kw)
    );
    this.page = 1;
  }

  openNew() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset();
    this.showModal = true;
  }

  openEdit(f: FicheAtelier) {
    this.isNew = false;
    this.editingId = f.id;
    this.form.patchValue({
      numero: f.numero,
      descriptionTravaux: f.descriptionTravaux,
      listeReception: f.listeReception ?? '',
      listeDefauts: f.listeDefauts ?? '',
      vehiculeId: f.vehicule?.id ?? null,
      dateSortie: f.dateSortie ? f.dateSortie.substring(0, 10) : '',
    });
    this.showModal = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const raw = this.form.value;
    const payload = {
      numero: raw.numero,
      descriptionTravaux: raw.descriptionTravaux,
      listeReception: raw.listeReception || undefined,
      listeDefauts: raw.listeDefauts || undefined,
      vehiculeId: Number(raw.vehiculeId),
      dateSortie: raw.dateSortie || undefined,
    };
    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    req$.subscribe({
      next: () => { this.showModal = false; this.load(); this.notify('Fiche enregistrée.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la sauvegarde.'); },
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer cette fiche atelier ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.notify('Fiche supprimée.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  get paged(): FicheAtelier[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  formatDate(d: string | null): string {
    return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  }

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
