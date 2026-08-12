import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RendezVousService } from '../../services/rendezvous.service';
import { MecanicienService } from '../../services/mecanicien.service';
import { ClientService } from '../../services/client.service';
import { VehiculeService } from '../../services/vehicule.service';
import { GarageService } from '../../services/garage.service';
import { AuthService } from '../../core/services/auth.service';
import { RendezVous, RendezVousStatus, Mecanicien, UserModel, VehiculeModel, Garage } from '../../shared/models/index';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import {
  LucideSearch, LucideX, LucideCalendar, LucideCheck, LucidePencil, LucideUser,
} from '@lucide/angular';

@Component({
  selector: 'app-rendezvous',
  standalone: true,
  imports: [
    ReactiveFormsModule, AlertComponent, PaginationComponent,
    LucideSearch, LucideX, LucideCalendar, LucideCheck, LucidePencil],
  templateUrl: './rendezvous.component.html',
})
export class RendezVousComponent implements OnInit {
  private service = inject(RendezVousService);
  private mecanicienService = inject(MecanicienService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private garageService = inject(GarageService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  rdvs: RendezVous[] = [];
  filtered: RendezVous[] = [];
  mecaniciens: Mecanicien[] = [];
  clients: UserModel[] = [];
  vehicules: VehiculeModel[] = [];
  garages: Garage[] = [];
  selectedMecanicienIds = new Set<number>();
  editedDate = '';

  loading = true;
  saving = false;
  showStatutModal = false;
  showValiderModal = false;
  showCreateModal = false;
  showClientCreateForm = false;
  showVehicleCreateForm = false;
  editingRdv: RendezVous | null = null;

  searchText = '';
  filterStatut: RendezVousStatus | '' = '';

  page = 1;
  pageSize = 10;
  successMessage = '';
  errorMessage = '';
  modalErrorMessage = '';
  modalSuccessMessage = '';

  readonly statutOptions: { value: RendezVousStatus; label: string }[] = [
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'CONFIRME',   label: 'Confirmé'  },
    { value: 'REFUSE',     label: 'Refusé'    },
    { value: 'ANNULE',     label: 'Annulé'    },
    { value: 'TERMINE',    label: 'Terminé'   },
  ];

  statutForm: FormGroup = this.fb.group({
    statut:      ['', Validators.required],
    commentaire: [''],
  });

  createForm: FormGroup = this.fb.group({
    clientId: [null, Validators.required],
    vehiculeId: [null, Validators.required],
    garageId: [null, Validators.required],
    dateRendezVous: ['', Validators.required],
    motif: ['', Validators.required],
  });
  clientForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required], lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]], phone: ['', Validators.required],
    username: ['', Validators.required], password: ['', Validators.required],
  });
  vehicleForm: FormGroup = this.fb.group({
    immatriculation: ['', Validators.required], marque: ['', Validators.required], modele: ['', Validators.required],
    annee: [null], kilometrage: [null], numeroChassis: [''],
  });
  clientSearchTerm = '';
  clientSearching = false;

  get isAgent(): boolean { return this.authService.hasRole('ROLE_AGENT'); }
  get availableVehicles(): VehiculeModel[] {
    const clientId = Number(this.createForm.get('clientId')?.value);
    return this.vehicules.filter(v => v.client?.id === clientId);
  }
  get statusOptionsForRole() {
    return this.statutOptions;
  }

  ngOnInit() {
    this.load();
    this.mecanicienService.getAll().subscribe({ next: data => this.mecaniciens = data });
    this.vehiculeService.getAll().subscribe({ next: data => this.vehicules = data });
    this.garageService.getAll().subscribe({ next: data => this.garages = data });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.rdvs = data; this.applyFilters(); this.loading = false; },
      error: () => this.loading = false,
    });
  }

  applyFilters() {
    let result = [...this.rdvs];
    if (this.searchText) {
      const kw = this.searchText.toLowerCase();
      result = result.filter(r =>
        r.clientName.toLowerCase().includes(kw) ||
        (r.motif ?? '').toLowerCase().includes(kw) ||
        (r.vehiculeImmatriculation ?? '').toLowerCase().includes(kw)
      );
    }
    if (this.filterStatut) {
      result = result.filter(r => r.statut === this.filterStatut);
    }
    this.filtered = result;
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchText = (e.target as HTMLInputElement).value;
    this.applyFilters();
  }

  onStatutFilter(e: Event) {
    this.filterStatut = (e.target as HTMLSelectElement).value as RendezVousStatus | '';
    this.applyFilters();
  }

  openStatut(rdv: RendezVous) {
    this.editingRdv = rdv;
    this.modalErrorMessage = '';
    this.modalSuccessMessage = '';
    this.statutForm.patchValue({ statut: rdv.statut, commentaire: rdv.commentaire ?? '' });
    this.showStatutModal = true;
  }

  openCreate() {
    this.createForm.reset();
    this.clientForm.reset();
    this.vehicleForm.reset();
    this.clients = [];
    this.clientSearchTerm = '';
    this.showClientCreateForm = false;
    this.showVehicleCreateForm = false;
    this.modalErrorMessage = '';
    this.showCreateModal = true;
  }

  onCreateClientChange() {
    this.createForm.patchValue({ vehiculeId: null });
  }

  searchClients(value: string) {
    this.clientSearchTerm = value;
    this.createForm.patchValue({ clientId: null, vehiculeId: null });
    if (value.trim().length < 2) { this.clients = []; return; }
    this.clientSearching = true;
    this.clientService.getAll(value.trim()).subscribe({
      next: data => { this.clients = data.filter(c => c.enabled); this.clientSearching = false; },
      error: () => { this.clients = []; this.clientSearching = false; },
    });
  }

  selectCreateClient(client: UserModel) {
    this.createForm.patchValue({ clientId: client.id, vehiculeId: null });
    this.clientSearchTerm = `${client.firstName} ${client.lastName} — ${client.phone}`;
    this.clients = [];
    this.showClientCreateForm = false;
  }

  openClientCreate() {
    this.clientForm.reset();
    this.showClientCreateForm = true;
    this.showVehicleCreateForm = false;
    this.modalErrorMessage = '';
  }

  saveClient() {
    if (this.clientForm.invalid || this.saving) { this.clientForm.markAllAsTouched(); return; }
    this.saving = true;
    const raw = this.clientForm.value;
    this.clientService.create({ ...raw, matricule: `CLT-${Date.now()}`, type: 'CLIENT' }).subscribe({
      next: () => this.clientService.getAll(raw.email).subscribe({
        next: clients => {
          const client = clients.find(c => c.email === raw.email);
          this.saving = false;
          if (!client) { this.modalErrorMessage = 'Client créé, mais introuvable. Recherchez-le à nouveau.'; return; }
          this.selectCreateClient(client);
          this.showClientCreateForm = false;
          this.openVehicleCreate();
        },
        error: () => { this.saving = false; this.modalErrorMessage = 'Client créé, mais introuvable. Recherchez-le à nouveau.'; },
      }),
      error: err => { this.saving = false; this.modalErrorMessage = err.error?.message || err.error || 'Erreur lors de la création du client.'; },
    });
  }

  openVehicleCreate() {
    if (!this.createForm.value.clientId) return;
    this.vehicleForm.reset();
    this.showVehicleCreateForm = true;
    this.modalErrorMessage = '';
  }

  saveVehicle() {
    if (this.vehicleForm.invalid || !this.createForm.value.clientId || this.saving) { this.vehicleForm.markAllAsTouched(); return; }
    this.saving = true;
    this.vehiculeService.create({ ...this.vehicleForm.value, clientId: this.createForm.value.clientId }).subscribe({
      next: vehicle => {
        this.saving = false;
        this.vehicules = [...this.vehicules, vehicle];
        this.createForm.patchValue({ vehiculeId: vehicle.id });
        this.showVehicleCreateForm = false;
      },
      error: err => { this.saving = false; this.modalErrorMessage = err.error?.message || 'Erreur lors de la création du véhicule.'; },
    });
  }

  saveCreate() {
    if (this.createForm.invalid || this.saving) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.modalErrorMessage = '';
    const data = this.createForm.value;
    this.service.create(Number(data.clientId), data).subscribe({
      next: () => { this.saving = false; this.showCreateModal = false; this.load(); this.notify('Rendez-vous créé.'); },
      error: err => { this.saving = false; this.modalErrorMessage = err.error?.message || err.error || 'Erreur lors de la création du rendez-vous.'; },
    });
  }

  openValider(rdv: RendezVous) {
    this.editingRdv = rdv;
    this.selectedMecanicienIds = new Set();
    this.editedDate = this.toDatetimeLocal(rdv.dateRendezVous);
    this.modalErrorMessage = '';
    this.modalSuccessMessage = '';
    this.showValiderModal = true;
  }

  onDateChange(e: Event) {
    this.editedDate = (e.target as HTMLInputElement).value;
  }

  /** Convertit une date ISO (back) en valeur compatible <input type="datetime-local">. */
  private toDatetimeLocal(iso: string): string {
    return iso ? iso.slice(0, 16) : '';
  }

  saveStatut() {
    if (this.statutForm.invalid || !this.editingRdv) { this.statutForm.markAllAsTouched(); return; }
    this.saving = true;
    const { statut, commentaire } = this.statutForm.value;
    this.service.updateStatut(this.editingRdv.id, statut, commentaire || undefined).subscribe({
      next: () => { this.showStatutModal = false; this.load(); this.notify('Statut mis à jour.'); },
      error: (err) => { this.saving = false; this.modalErrorMessage = err.error || 'Erreur lors de la mise à jour.'; },
    });
  }

  saveValider() {
    if (!this.editingRdv) return;
    this.saving = true;
    this.modalErrorMessage = '';

    const dateChanged = this.editedDate !== this.toDatetimeLocal(this.editingRdv.dateRendezVous);
    const mecanicienIds = this.isAgent ? [] : Array.from(this.selectedMecanicienIds);

    const doValider = () => {
      this.service.valider(this.editingRdv!.id, mecanicienIds).subscribe({
        next: () => { this.showValiderModal = false; this.load(); this.notify('Rendez-vous validé. Fiche atelier créée.'); },
        error: (err) => { this.saving = false; this.modalErrorMessage = err.error || 'Erreur lors de la validation.'; },
      });
    };

    if (dateChanged) {
      this.service.updateDate(this.editingRdv.id, this.editedDate).subscribe({
        next: () => doValider(),
        error: (err) => { this.saving = false; this.modalErrorMessage = err.error || 'Erreur lors de la modification de la date.'; },
      });
    } else {
      doValider();
    }
  }

  toggleMecanicien(id: number) {
    if (this.selectedMecanicienIds.has(id)) {
      this.selectedMecanicienIds.delete(id);
    } else {
      this.selectedMecanicienIds.add(id);
    }
  }

  get paged(): RendezVous[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  statutLabel(s: RendezVousStatus): string {
    return this.statutOptions.find(o => o.value === s)?.label ?? s;
  }

  statutClass(s: RendezVousStatus): string {
    const map: Record<RendezVousStatus, string> = {
      EN_ATTENTE: 'bg-amber-100 text-amber-700',
      CONFIRME:   'bg-green-100 text-green-700',
      REFUSE:     'bg-red-100 text-red-700',
      ANNULE:     'bg-gray-100 text-gray-500',
      TERMINE:    'bg-blue-100 text-blue-700',
    };
    return map[s] ?? '';
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
