import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgClass, DatePipe, DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ClientService } from '../services/client.service';
import { VehiculeService } from '../services/vehicule.service';
import { BonDeSortieService } from '../services/bon-de-sortie.service';
import { FactureService, FactureModel } from '../services/facture.service';
import { UserModel, VehiculeModel } from '../shared/models';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideArchive, LucideArchiveRestore, LucideX, LucideCheck, LucideUser, LucideArrowRight } from '@lucide/angular';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, DatePipe, DecimalPipe, AlertComponent, PaginationComponent, LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideArchive, LucideArchiveRestore, LucideX, LucideCheck, LucideUser, LucideArrowRight],
  templateUrl: './clients.component.html',
})
export class ClientsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private bonService = inject(BonDeSortieService);
  private factureService = inject(FactureService);

  clients: UserModel[] = [];
  filtered: UserModel[] = [];
  allVehicules: VehiculeModel[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showCreateModal = false;
  showEditModal = false;
  editingClient: UserModel | null = null;

  // 2-step creation
  createStep = 1;
  createdClientId: number | null = null;
  addingVehicle = false;

  // Risk modal (hard delete)
  showRiskModal = false;
  riskClient: UserModel | null = null;
  riskLoading = false;
  riskVehicleCount = 0;
  riskBonCount = 0;
  riskFactures: FactureModel[] = [];

  filterStatut = '';
  searchTerm = '';

  // Detail panel
  selectedClient: UserModel | null = null;
  detailTab: 'profil' | 'vehicules' = 'profil';
  clientVehicules: VehiculeModel[] = [];
  loadingVehicules = false;

  createForm = this.fb.group({
    matricule: [{ value: '', disabled: true }, Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  vehicleForm = this.fb.group({
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    annee: [null as number | null],
    kilometrage: [null as number | null],
    numeroChassis: [''],
  });

  editForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
  });

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading = true;
    this.clientService.getAll().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.applyFilter();
        this.loading = false;
        // Refresh selected client data if one is selected
        if (this.selectedClient) {
          const updated = clients.find(c => c.id === this.selectedClient!.id);
          if (updated) this.selectedClient = updated;
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger les clients. Vérifiez que le serveur est démarré.';
      },
    });
    this.vehiculeService.getAll().subscribe({
      next: (vehicules) => { this.allVehicules = vehicules; },
    });
  }

  private nextMatricule(prefix: string, existing: string[]): string {
    const p = `${prefix}-`;
    const nums = existing
      .map(m => m?.startsWith(p) ? parseInt(m.slice(p.length), 10) : NaN)
      .filter(n => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${p}${String(next).padStart(5, '0')}`;
  }

  get generatedMatricule(): string {
    return this.createForm.getRawValue().matricule ?? '';
  }

  applyFilter() {
    let data = this.clients;
    if (this.filterStatut === 'actif') data = data.filter(c => c.enabled);
    else if (this.filterStatut === 'archive') data = data.filter(c => !c.enabled);
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      const clientsWithMatchingVehicles = new Set(
        this.allVehicules
          .filter(v =>
            v.immatriculation.toLowerCase().includes(kw) ||
            v.marque.toLowerCase().includes(kw) ||
            v.modele.toLowerCase().includes(kw)
          )
          .map(v => v.client?.id)
          .filter((id): id is number => id != null)
      );
      data = data.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(kw) ||
        c.email.toLowerCase().includes(kw) ||
        c.matricule.toLowerCase().includes(kw) ||
        c.phone.includes(kw) ||
        clientsWithMatchingVehicles.has(c.id)
      );
    }
    this.filtered = data;
    this.page = 1;
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.applyFilter();
  }

  onStatutFilter(event: Event) {
    this.filterStatut = (event.target as HTMLSelectElement).value;
    this.applyFilter();
  }

  get paged(): UserModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  clientVehicleCount(clientId: number): number {
    return this.allVehicules.filter(v => v.client?.id === clientId).length;
  }

  // Avatar color based on client name
  avatarColor(name: string): string {
    const colors = [
      '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
      '#f59e0b', '#ef4444', '#ec4899', '#6366f1',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  clientInitials(client: UserModel): string {
    return `${client.firstName[0] ?? ''}${client.lastName[0] ?? ''}`.toUpperCase();
  }

  // Detail panel
  selectClient(client: UserModel) {
    this.selectedClient = client;
    this.detailTab = 'vehicules';
    this.clientVehicules = [];
    this.loadClientVehicules(client.id);
  }

  closeDetail() {
    this.selectedClient = null;
    this.clientVehicules = [];
  }

  setDetailTab(tab: 'profil' | 'vehicules') {
    this.detailTab = tab;
    if (tab === 'vehicules' && this.selectedClient) {
      this.loadClientVehicules(this.selectedClient.id);
    }
  }

  loadClientVehicules(clientId: number) {
    this.loadingVehicules = true;
    this.vehiculeService.getByClient(clientId).subscribe({
      next: (v) => { this.clientVehicules = v; this.loadingVehicules = false; },
      error: () => { this.loadingVehicules = false; },
    });
  }

  // ── ARCHIVE / UNARCHIVE (direct, no modal) ────────────────────────
  archive(client: UserModel) {
    this.clientService.archive(client.id).subscribe({
      next: () => {
        this.showSuccess(`Client ${client.firstName} ${client.lastName} archivé.`);
        this.loadAll();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || err.error || 'Erreur lors de l\'archivage.';
      }
    });
  }

  unarchive(client: UserModel) {
    this.clientService.unarchive(client.id).subscribe({
      next: () => {
        this.showSuccess(`Client ${client.firstName} ${client.lastName} désarchivé.`);
        this.loadAll();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || err.error || 'Erreur lors du désarchivage.';
      }
    });
  }

  // ── RISK MODAL (hard delete) ───────────────────────────────────────
  openRiskModal(client: UserModel) {
    this.riskClient = client;
    this.riskLoading = true;
    this.riskVehicleCount = 0;
    this.riskBonCount = 0;
    this.riskFactures = [];
    this.showRiskModal = true;

    forkJoin({
      vehicules: this.vehiculeService.getByClient(client.id),
      bons: this.bonService.getAll({ clientId: client.id }),
      factures: this.factureService.getAll(),
    }).subscribe({
      next: ({ vehicules, bons, factures }) => {
        this.riskVehicleCount = vehicules.length;
        this.riskBonCount = bons.length;
        this.riskFactures = factures.filter(f => f.clientId === client.id);
        this.riskLoading = false;
      },
      error: () => { this.riskLoading = false; }
    });
  }

  closeRiskModal() {
    this.showRiskModal = false;
    this.riskClient = null;
  }

  confirmHardDelete() {
    if (!this.riskClient || this.saving) return;
    this.saving = true;
    this.clientService.delete(this.riskClient.id).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess(`Client ${this.riskClient!.firstName} ${this.riskClient!.lastName} supprimé définitivement.`);
        if (this.selectedClient?.id === this.riskClient!.id) this.closeDetail();
        this.closeRiskModal();
        this.loadAll();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message || err.error || '';
        if (msg.toLowerCase().includes('constraint') || msg.toLowerCase().includes('foreign') || msg.toLowerCase().includes('reference')) {
          this.errorMessage = 'Suppression impossible : ce client possède des données liées (factures, véhicules ou bons de sortie). Archivez-le à la place.';
        } else {
          this.errorMessage = msg || 'Erreur lors de la suppression.';
        }
        this.closeRiskModal();
      }
    });
  }

  confirmArchiveFromModal() {
    if (!this.riskClient || this.saving) return;
    this.saving = true;
    this.clientService.archive(this.riskClient.id).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess(`Client ${this.riskClient!.firstName} ${this.riskClient!.lastName} archivé.`);
        this.closeRiskModal();
        this.loadAll();
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || err.error || 'Erreur lors de l\'archivage.';
        this.closeRiskModal();
      }
    });
  }

  // ── CREATE (step 1 : client info) ──────────────────────────────
  openCreate() {
    const mat = this.nextMatricule('CLT', this.clients.map(c => c.matricule));
    this.createForm.reset();
    this.createForm.get('matricule')?.setValue(mat);
    this.vehicleForm.reset();
    this.errorMessage = '';
    this.createStep = 1;
    this.createdClientId = null;
    this.addingVehicle = false;
    this.showCreateModal = true;
  }

  closeCreate() {
    this.showCreateModal = false;
    this.createForm.reset();
    this.vehicleForm.reset();
    this.errorMessage = '';
    this.createStep = 1;
    this.createdClientId = null;
  }

  saveCreate() {
    const active = Object.fromEntries(
      Object.entries(this.createForm.controls)
        .filter(([, ctrl]) => ctrl !== this.createForm.get('matricule'))
        .map(([k, ctrl]) => [k, ctrl.value])
    );
    if (Object.values(active).some(v => !v) || this.saving) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.createForm.getRawValue() as any;
    this.clientService.create({ ...raw, type: 'CLIENT' }).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.errorMessage = '';
        this.loadAll();
        this.createStep = 2;
        this.addingVehicle = false;
        this.createdClientId = typeof res === 'object' && res?.id ? res.id : null;
        if (!this.createdClientId) {
          this.clientService.getAll().subscribe({
            next: (clients) => {
              const mat = this.createForm.getRawValue().matricule;
              const found = clients.find(c => c.matricule === mat);
              this.createdClientId = found?.id ?? null;
            }
          });
        }
      },
      error: (err: any) => { this.saving = false; this.errorMessage = this.parseError(err); }
    });
  }

  skipVehicle() {
    this.showSuccess('Client créé avec succès !');
    this.closeCreate();
  }

  startAddVehicle() {
    this.addingVehicle = true;
    this.vehicleForm.reset();
    this.errorMessage = '';
  }

  cancelVehicle() {
    this.addingVehicle = false;
    this.vehicleForm.reset();
    this.errorMessage = '';
  }

  saveVehicle() {
    if (this.vehicleForm.invalid || !this.createdClientId || this.saving) {
      this.vehicleForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.vehicleForm.value as any;
    this.vehiculeService.create({ ...v, clientId: this.createdClientId }).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Client et véhicule créés avec succès !');
        this.loadAll();
        this.closeCreate();
      },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la création du véhicule.'; }
    });
  }

  // Ajout vehicule depuis panneau detail
  openAddVehicleFromDetail() {
    if (!this.selectedClient) return;
    this.createdClientId = this.selectedClient.id;
    this.vehicleForm.reset();
    this.errorMessage = '';
    this.addingVehicle = true;
    this.showCreateModal = true;
    this.createStep = 2;
  }

  saveVehicleFromDetail() {
    if (this.vehicleForm.invalid || !this.createdClientId || this.saving) {
      this.vehicleForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.vehicleForm.value as any;
    this.vehiculeService.create({ ...v, clientId: this.createdClientId }).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Véhicule ajouté avec succès !');
        this.showCreateModal = false;
        this.addingVehicle = false;
        this.vehicleForm.reset();
        this.loadAll();
        if (this.selectedClient) this.loadClientVehicules(this.selectedClient.id);
      },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la création du véhicule.'; }
    });
  }

  // ── EDIT ───────────────────────────────────────────────────────
  openEdit(client: UserModel) {
    this.editingClient = client;
    this.editForm.patchValue({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
    });
    this.errorMessage = '';
    this.showEditModal = true;
  }

  closeModal() {
    this.showEditModal = false;
    this.editingClient = null;
    this.editForm.reset();
    this.errorMessage = '';
  }

  saveEdit() {
    if (this.editForm.invalid || !this.editingClient || this.saving) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.clientService.update(this.editingClient.id, this.editForm.value as any).subscribe({
      next: () => { this.saving = false; this.showSuccess('Client modifié avec succès !'); this.closeModal(); this.loadAll(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la modification.'; }
    });
  }

  parseError(err: any): string {
    const raw: string = err?.error?.message ?? (typeof err?.error === 'string' ? err.error : '');
    if (!raw) return 'Une erreur est survenue.';
    const lower = raw.toLowerCase();
    if (lower.includes('email') && (lower.includes('déjà') || lower.includes('already') || lower.includes('duplicate') || lower.includes('unique'))) return 'Cet email est déjà utilisé par un autre compte.';
    if ((lower.includes('username') || lower.includes('identifiant')) && (lower.includes('déjà') || lower.includes('already'))) return "Cet identifiant est déjà utilisé par un autre compte.";
    if (lower.includes('phone') || lower.includes('téléphone')) return 'Ce numéro de téléphone est déjà utilisé.';
    if (lower.includes('matricule')) return 'Ce matricule est déjà utilisé.';
    if (lower.includes('duplicate') || lower.includes('unique') || lower.includes('constraint') || lower.includes('23505')) return 'Une valeur unique (email, identifiant ou téléphone) est déjà utilisée.';
    if (raw.length < 200 && !raw.includes('Exception') && !raw.includes('Statement')) return raw;
    return 'Une erreur est survenue lors de la création.';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get canHardDelete(): boolean {
    return this.riskVehicleCount === 0 && this.riskBonCount === 0 && this.riskFactures.length === 0;
  }

  get fCreate() { return this.createForm.controls; }
  get fEdit() { return this.editForm.controls; }
  get fVehicle() { return this.vehicleForm.controls; }
}
