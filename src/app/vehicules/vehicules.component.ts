import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehiculeService, VehiculeModel } from '../services/vehicule.service';
import { ClientService, UserModel } from '../services/client.service';

@Component({
  selector: 'app-vehicules',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './vehicules.component.html',
})
export class VehiculesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private vehiculeService = inject(VehiculeService);
  private clientService = inject(ClientService);

  vehicules: VehiculeModel[] = [];
  filtered: VehiculeModel[] = [];
  clients: UserModel[] = [];
  loading = false;
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
  }

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.form.value as any;

    if (this.isNew) {
      this.vehiculeService.create(payload).subscribe({
        next: () => { this.showSuccess('Véhicule créé avec succès !'); this.closeModal(); this.loadVehicules(); },
        error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la création.'; }
      });
    } else {
      this.vehiculeService.update(this.editingId!, payload).subscribe({
        next: () => { this.showSuccess('Véhicule modifié avec succès !'); this.closeModal(); this.loadVehicules(); },
        error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la modification.'; }
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
