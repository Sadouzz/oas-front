import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService } from '../services/client.service';
import { UserModel } from '../shared/models';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, PaginationComponent],
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

  showEditModal = false;
  editingClient: UserModel | null = null;

  editForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
  });

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.loading = true;
    this.clientService.getAll().subscribe({
      next: (data) => {
        this.clients = data;
        this.filtered = data;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.filtered = term
      ? this.clients.filter(c =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.matricule.toLowerCase().includes(term) ||
          c.phone.includes(term)
        )
      : this.clients;
    this.page = 1;
  }

  get paged(): UserModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  openEdit(client: UserModel) {
    this.editingClient = client;
    this.editForm.patchValue({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
    });
    this.showEditModal = true;
  }

  closeModal() {
    this.showEditModal = false;
    this.editingClient = null;
    this.editForm.reset();
  }

  saveEdit() {
    if (this.editForm.invalid || !this.editingClient || this.saving) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.clientService.update(this.editingClient.id, this.editForm.value as any).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Client modifié avec succès !');
        this.closeModal();
        this.loadClients();
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la modification.';
      }
    });
  }

  archive(client: UserModel) {
    this.clientService.archive(client.id).subscribe({
      next: () => { this.showSuccess('Client archivé.'); this.loadClients(); }
    });
  }

  unarchive(client: UserModel) {
    this.clientService.unarchive(client.id).subscribe({
      next: () => { this.showSuccess('Client désarchivé.'); this.loadClients(); }
    });
  }

  deleteClient(client: UserModel) {
    if (!confirm(`Supprimer ${client.firstName} ${client.lastName} ? Cette action est irréversible.`)) return;
    this.clientService.delete(client.id).subscribe({
      next: () => { this.showSuccess('Client supprimé.'); this.loadClients(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la suppression.'; }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get fEdit() { return this.editForm.controls; }
}
