import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TechnicienService } from '../../services/technicien.service';
import { GarageService } from '../../services/garage.service';
import { Technicien, Specialite } from '../../shared/models/index';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideWrench } from '@lucide/angular';
import { AuthService } from '../auth/services/auth.service';

const SPECIALITES: { value: Specialite; label: string }[] = [
  { value: 'MECANIQUE_GENERALE', label: 'Mécanique générale' },
  { value: 'ELECTRICITE_AUTO', label: 'Électricité auto' },
  { value: 'CARROSSERIE_PEINTURE', label: 'Carrosserie / Peinture' },
  { value: 'TOLERIE', label: 'Tôlerie' },
  { value: 'CLIMATISATION', label: 'Climatisation' },
  { value: 'DIAGNOSTIC_ELECTRONIQUE', label: 'Diagnostic électronique' },
  { value: 'PNEUMATIQUE', label: 'Pneumatique' },
];

@Component({
  selector: 'app-techniciens',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, PaginationComponent, LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './techniciens.component.html',
})
export class TechniciensComponent implements OnInit {
  private service = inject(TechnicienService);
  private garageService = inject(GarageService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  get isSuperAgent(): boolean { return this.authService.getRole() === 'ROLE_SUPER_AGENT'; }
  // Création d'un compte technicien réservée à SUPER_AGENT/MASTER (garde-fou identique côté back,
  // AuthServiceImpl.verifierCreateurTechnicienAutorise) — le chef d'atelier consulte la liste
  // mais ne peut pas en créer.
  get canCreate(): boolean {
    const role = this.authService.getRole();
    return role === 'ROLE_SUPER_AGENT' || role === 'ROLE_MASTER';
  }

  techniciens: Technicien[] = [];
  filtered: Technicien[] = [];
  garages: any[] = [];
  loading = true;
  saving = false;
  showModal = false;
  isNew = true;
  editingId: number | null = null;
  page = 1;
  pageSize = 10;
  successMessage = '';
  errorMessage = '';
  modalErrorMessage = '';

  readonly specialites = SPECIALITES;

  form: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: [''],
    phone: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    adresse: [''],
    specialite: [null as Specialite | null],
    garageId: [null as number | null],
  });

  ngOnInit() {
    this.load();
    if (this.isSuperAgent) {
      this.garageService.getAll().subscribe({ next: data => this.garages = data });
    }
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.techniciens = data; this.filtered = data; this.loading = false; },
      error: () => this.loading = false,
    });
  }

  onSearch(e: Event) {
    const kw = (e.target as HTMLInputElement).value.toLowerCase();
    this.filtered = this.techniciens.filter(t =>
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(kw) ||
      t.username.toLowerCase().includes(kw) ||
      t.email.toLowerCase().includes(kw) ||
      t.matricule.toLowerCase().includes(kw)
    );
    this.page = 1;
  }

  openNew() {
    this.isNew = true;
    this.editingId = null;
    this.modalErrorMessage = '';
    this.form.reset({ garageId: null, specialite: null });
    this.form.get('password')?.setValidators(Validators.required);
    this.form.get('username')?.setValidators(Validators.required);
    this.form.get('password')?.updateValueAndValidity();
    this.form.get('username')?.updateValueAndValidity();
    this.showModal = true;
  }

  openEdit(t: Technicien) {
    this.isNew = false;
    this.editingId = t.id;
    this.modalErrorMessage = '';
    this.form.get('password')?.clearValidators();
    this.form.get('username')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.form.get('username')?.updateValueAndValidity();
    this.form.patchValue({
      username: t.username,
      password: '',
      phone: t.phone,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      adresse: t.adresse ?? '',
      specialite: t.specialite ?? null,
      garageId: t.garage?.id ?? null,
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.modalErrorMessage = '';
  }

  specialiteLabel(s: string | null | undefined): string {
    return this.specialites.find(o => o.value === s)?.label ?? '—';
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    this.modalErrorMessage = '';
    const raw = this.form.value;
    const payload = {
      username: raw.username,
      password: raw.password || undefined,
      phone: raw.phone,
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      adresse: raw.adresse || null,
      specialite: raw.specialite || null,
      garageId: raw.garageId || null,
    };
    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    req$.subscribe({
      next: () => { this.showModal = false; this.load(); this.notify('Technicien enregistré.'); },
      error: (err: any) => { this.saving = false; this.modalErrorMessage = err.error?.message || 'Erreur lors de la sauvegarde.'; },
    });
  }

  delete(t: Technicien) {
    if (!confirm(`Supprimer le technicien ${t.firstName} ${t.lastName} ?`)) return;
    this.service.delete(t.id).subscribe({
      next: () => { this.load(); this.notify('Technicien supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  get paged(): Technicien[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }

  private notify(msg: string) {
    this.saving = false;
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
