import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService, UserModel } from '../services/client.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './clients.component.html',
})
export class ClientsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);

  clients: UserModel[] = [];
  filtered: UserModel[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  keyword = '';
  statusFilter: 'all' | 'active' | 'archived' = 'all';

  showEditModal = false;
  showCreateModal = false;
  editingClient: UserModel | null = null;

  editForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    phone:     ['', Validators.required],
  });

  createForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    username:  ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    phone:     ['', Validators.required],
    matricule: [{ value: '', disabled: true }, Validators.required],
    password:  ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit() { this.loadClients(); }

  loadClients() {
    this.loading = true;
    this.clientService.getAll().subscribe({
      next: (data) => { this.clients = data; this.applyFilters(); this.loading = false; },
      error: () => { this.loading = false; this.notifyError('Impossible de charger les clients.'); }
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
    let result = this.clients;
    if (this.statusFilter === 'active')   result = result.filter(c => c.enabled);
    if (this.statusFilter === 'archived') result = result.filter(c => !c.enabled);
    if (this.keyword) {
      result = result.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(this.keyword) ||
        c.email.toLowerCase().includes(this.keyword) ||
        c.matricule.toLowerCase().includes(this.keyword) ||
        c.phone.includes(this.keyword)
      );
    }
    this.filtered = result;
    this.page = 1;
  }

  get paged(): UserModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get rangeEnd(): number   { return Math.min(this.page * this.pageSize, this.filtered.length); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  openCreate() {
    this.createForm.reset();
    this.createForm.patchValue({ matricule: this.nextMatricule('CLT', this.clients) });
    this.showCreateModal = true;
  }

  private nextMatricule(prefix: string, list: { matricule?: string }[]): string {
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    const nums = list.map(i => i.matricule ?? '').map(m => { const match = m.match(re); return match ? parseInt(match[1], 10) : 0; }).filter(n => n > 0);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `${prefix}-${String(next).padStart(5, '0')}`;
  }

  saveCreate() {
    if (this.createForm.invalid || this.saving) { this.createForm.markAllAsTouched(); return; }
    this.saving = true;
    this.clientService.create(this.createForm.getRawValue() as any).subscribe({
      next: () => {
        this.saving = false; this.showCreateModal = false;
        this.notify('Client créé avec succès !'); this.loadClients();
      },
      error: (err: any) => { this.saving = false; this.notifyError(err.error?.message || 'Erreur lors de la création.'); }
    });
  }

  openEdit(client: UserModel) {
    this.editingClient = client;
    this.editForm.patchValue({ firstName: client.firstName, lastName: client.lastName, email: client.email, phone: client.phone });
    this.showEditModal = true;
  }

  closeModals() {
    this.showEditModal = false; this.showCreateModal = false;
    this.editingClient = null; this.editForm.reset(); this.createForm.reset();
  }

  saveEdit() {
    if (this.editForm.invalid || !this.editingClient || this.saving) { this.editForm.markAllAsTouched(); return; }
    this.saving = true;
    this.clientService.update(this.editingClient.id, this.editForm.value as any).subscribe({
      next: () => { this.saving = false; this.notify('Client modifié avec succès !'); this.closeModals(); this.loadClients(); },
      error: (err: any) => { this.saving = false; this.notifyError(err.error?.message || 'Erreur lors de la modification.'); }
    });
  }

  archive(client: UserModel) {
    this.clientService.archive(client.id).subscribe({
      next: () => { this.notify('Client archivé.'); this.loadClients(); },
      error: () => this.notifyError('Impossible d\'archiver ce client.')
    });
  }

  unarchive(client: UserModel) {
    this.clientService.unarchive(client.id).subscribe({
      next: () => { this.notify('Client désarchivé.'); this.loadClients(); },
      error: () => this.notifyError('Impossible de désarchiver ce client.')
    });
  }

  deleteClient(client: UserModel) {
    if (!confirm(`Supprimer ${client.firstName} ${client.lastName} ? Cette action est irréversible.`)) return;
    this.clientService.delete(client.id).subscribe({
      next: () => { this.notify('Client supprimé.'); this.loadClients(); },
      error: (err: any) => this.notifyError(err.error?.message || 'Erreur lors de la suppression.')
    });
  }

  private notify(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.errorMessage = msg; this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 4000);
  }

  get fEdit()   { return this.editForm.controls; }
  get fCreate() { return this.createForm.controls; }
}
