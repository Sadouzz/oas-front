import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehiculeService } from '../services/vehicule.service';
import { ClientService } from '../services/client.service';
import { UserModel, VehiculeModel } from '../shared/models';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-vehicules',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, AlertComponent, PaginationComponent],
  templateUrl: './vehicules.component.html',
})
export class VehiculesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private vehiculeService = inject(VehiculeService);
  private clientService = inject(ClientService);

  vehicules: VehiculeModel[] = [];
  filtered: VehiculeModel[] = [];
  page = 1;
  readonly pageSize = 10;
  clients: UserModel[] = [];
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showModal = false;
  isNew = false;
  editingId: number | null = null;

  form = this.fb.group({
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    annee: [null as number | null],
    kilometrage: [null as number | null],
    numeroChassis: [''],
    clientId: [null as number | null, Validators.required],
  });

  ngOnInit() {
    this.loadVehicules();
    this.clientService.getAll().subscribe({
      next: (data) => { this.clients = data.filter(c => c.enabled); }
    });
  }

  loadVehicules() {
    this.loading = true;
    this.vehiculeService.getAll().subscribe({
      next: (data) => {
        this.vehicules = data;
        this.filtered = data;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.filtered = term
      ? this.vehicules.filter(v =>
          v.immatriculation.toLowerCase().includes(term) ||
          v.marque.toLowerCase().includes(term) ||
          v.modele.toLowerCase().includes(term) ||
          `${v.client?.firstName} ${v.client?.lastName}`.toLowerCase().includes(term)
        )
      : this.vehicules;
    this.page = 1;
  }

  get paged(): VehiculeModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset();
    this.showModal = true;
  }

  openEdit(v: VehiculeModel) {
    this.isNew = false;
    this.editingId = v.id;
    this.form.patchValue({
      immatriculation: v.immatriculation,
      marque: v.marque,
      modele: v.modele,
      annee: v.annee,
      kilometrage: v.kilometrage,
      numeroChassis: v.numeroChassis,
      clientId: v.client?.id ?? null,
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.form.reset();
  }

  save() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const payload = this.form.value as any;

    if (this.isNew) {
      this.vehiculeService.create(payload).subscribe({
        next: () => { this.saving = false; this.showSuccess('Véhicule créé avec succès !'); this.closeModal(); this.loadVehicules(); },
        error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la création.'; }
      });
    } else {
      this.vehiculeService.update(this.editingId!, payload).subscribe({
        next: () => { this.saving = false; this.showSuccess('Véhicule modifié avec succès !'); this.closeModal(); this.loadVehicules(); },
        error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la modification.'; }
      });
    }
  }

  deleteVehicule(v: VehiculeModel) {
    if (!confirm(`Supprimer le véhicule ${v.immatriculation} ? Cette action est irréversible.`)) return;
    this.vehiculeService.delete(v.id).subscribe({
      next: () => { this.showSuccess('Véhicule supprimé.'); this.loadVehicules(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la suppression.'; }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get f() { return this.form.controls; }
}
