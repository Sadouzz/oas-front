import { Component, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { VehiculeService } from '../services/vehicule.service';
import { ClientService } from '../services/client.service';
import { UserModel, VehiculeModel } from '../shared/models';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideArchive, LucideArchiveRestore, LucideX, LucideCar } from '@lucide/angular';

@Component({
  selector: 'app-vehicules',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, AlertComponent, PaginationComponent, LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideArchive, LucideArchiveRestore, LucideX, LucideCar],
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

  // 2-step creation
  createStep = 1;
  pendingVehicle: any = null;

  filterMarque = '';
  filterClientId: number | null = null;
  searchTerm = '';

  // Step 1 form (vehicle info)
  infoForm = this.fb.group({
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    annee: [null as number | null],
    kilometrage: [null as number | null],
    numeroChassis: [''],
  });

  // Step 2 form (select client)
  clientForm = this.fb.group({
    clientId: [null as number | null, Validators.required],
  });

  editingClient: UserModel | null = null;

  clientOpen = false;
  clientFilter = '';

  get clientLabel(): string {
    const id = this.clientForm.get('clientId')?.value;
    if (!id) return '';
    const c = this.clients.find(x => x.id === Number(id));
    return c ? `${c.firstName} ${c.lastName}` : '';
  }

  get filteredClients(): UserModel[] {
    if (!this.clientFilter) return this.clients;
    const kw = this.clientFilter.toLowerCase();
    return this.clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(kw) ||
      (c.phone ?? '').toLowerCase().includes(kw)
    );
  }

  selectClient(c: UserModel) {
    this.clientForm.patchValue({ clientId: c.id });
    this.clientFilter = '';
    this.clientOpen = false;
  }

  // Edit form (all fields except client — client cannot be changed after creation)
  editForm = this.fb.group({
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    annee: [null as number | null],
    kilometrage: [null as number | null],
    numeroChassis: [''],
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
      next: (data) => { this.vehicules = data; this.applyFilter(); this.loading = false; },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger les véhicules. Vérifiez que le serveur est démarré.';
      }
    });
  }

  get marques(): string[] {
    return [...new Set(this.vehicules.map(v => v.marque).filter(Boolean))].sort();
  }

  applyFilter() {
    let data = this.vehicules;
    if (this.filterMarque) data = data.filter(v => v.marque === this.filterMarque);
    if (this.filterClientId != null) data = data.filter(v => v.client?.id === this.filterClientId);
    if (this.searchTerm) {
      const kw = this.searchTerm;
      data = data.filter(v =>
        v.immatriculation.toLowerCase().includes(kw) ||
        v.marque.toLowerCase().includes(kw) ||
        v.modele.toLowerCase().includes(kw) ||
        `${v.client?.firstName} ${v.client?.lastName}`.toLowerCase().includes(kw)
      );
    }
    this.filtered = data;
    this.page = 1;
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  onMarqueFilter(event: Event) {
    this.filterMarque = (event.target as HTMLSelectElement).value;
    this.applyFilter();
  }

  onClientFilter(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterClientId = val ? Number(val) : null;
    this.applyFilter();
  }

  get paged(): VehiculeModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  // ── CREATE 2-STEP ──────────────────────────────────────────────
  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.createStep = 1;
    this.pendingVehicle = null;
    this.infoForm.reset();
    this.clientForm.reset();
    this.clientOpen = false;
    this.clientFilter = '';
    this.errorMessage = '';
    this.showModal = true;
  }

  nextStep() {
    if (this.infoForm.invalid) { this.infoForm.markAllAsTouched(); return; }
    this.pendingVehicle = this.infoForm.value;
    this.createStep = 2;
    this.errorMessage = '';
  }

  prevStep() {
    this.createStep = 1;
    this.errorMessage = '';
  }

  // ── EDIT ───────────────────────────────────────────────────────
  openEdit(v: VehiculeModel) {
    this.isNew = false;
    this.editingId = v.id;
    this.editingClient = v.client ?? null;
    this.editForm.patchValue({
      immatriculation: v.immatriculation,
      marque: v.marque,
      modele: v.modele,
      annee: v.annee,
      kilometrage: v.kilometrage,
      numeroChassis: v.numeroChassis,
    });
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.infoForm.reset();
    this.clientForm.reset();
    this.editForm.reset();
    this.createStep = 1;
    this.pendingVehicle = null;
    this.editingClient = null;
    this.errorMessage = '';
  }

  save() {
    if (this.isNew) {
      if (this.clientForm.invalid || this.saving) { this.clientForm.markAllAsTouched(); return; }
      this.saving = true;
      const payload = { ...this.pendingVehicle, clientId: this.clientForm.value.clientId };
      this.vehiculeService.create(payload).subscribe({
        next: () => { this.saving = false; this.showSuccess('Véhicule créé avec succès !'); this.closeModal(); this.loadVehicules(); },
        error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la création.'; }
      });
    } else {
      if (this.editForm.invalid || this.saving) { this.editForm.markAllAsTouched(); return; }
      this.saving = true;
      const payload = { ...this.editForm.value, clientId: this.editingClient?.id ?? null };
      this.vehiculeService.update(this.editingId!, payload as any).subscribe({
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

  get fInfo() { return this.infoForm.controls; }
  get fClient() { return this.clientForm.controls; }
  get fEdit() { return this.editForm.controls; }
}
