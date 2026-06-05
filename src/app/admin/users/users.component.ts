import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserManagementService } from '../../services/user-management.service';
import { UserModel } from '../../services/client.service';

const ROLES = ['SUPER_AGENT', 'AGENT', 'CHEF_ATELIER', 'AGENT_MAGASIN'] as const;

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserManagementService);

  users: UserModel[] = [];
  filtered: UserModel[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showModal = false;
  isNew = false;
  editingId: number | null = null;
  keyword = '';
  roleFilter = '';
  statusFilter: 'all' | 'active' | 'archived' = 'all';

  readonly roles = ROLES;

  form = this.fb.group({
    matricule: [{ value: '', disabled: true }, Validators.required],
    phone: ['', Validators.required],
    username: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['AGENT', Validators.required],
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (data) => { this.users = data; this.applyFilters(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  onSearch(event: Event) {
    this.keyword = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilters();
  }

  setRoleFilter(r: string) { this.roleFilter = r; this.applyFilters(); }
  setStatusFilter(s: 'all' | 'active' | 'archived') { this.statusFilter = s; this.applyFilters(); }

  private applyFilters() {
    let result = this.users;
    if (this.roleFilter) result = result.filter(u => u.role === this.roleFilter);
    if (this.statusFilter === 'active')   result = result.filter(u => u.enabled);
    if (this.statusFilter === 'archived') result = result.filter(u => !u.enabled);
    if (this.keyword) {
      result = result.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(this.keyword) ||
        u.email.toLowerCase().includes(this.keyword) ||
        u.matricule.toLowerCase().includes(this.keyword) ||
        u.username.toLowerCase().includes(this.keyword)
      );
    }
    this.filtered = result;
    this.page = 1;
  }

  get paged(): UserModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  get rangeEnd(): number { return Math.min(this.page * this.pageSize, this.filtered.length); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset({ role: 'AGENT' });
    this.form.patchValue({ matricule: this.nextMatricule('AGT', this.users) });
    this.form.get('password')?.setValidators(Validators.required);
    this.form.get('password')?.updateValueAndValidity();
    this.showModal = true;
  }

  private nextMatricule(prefix: string, list: { matricule?: string }[]): string {
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    const nums = list.map(i => i.matricule ?? '').map(m => { const match = m.match(re); return match ? parseInt(match[1], 10) : 0; }).filter(n => n > 0);
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `${prefix}-${String(next).padStart(5, '0')}`;
  }

  openEdit(user: UserModel) {
    this.isNew = false;
    this.editingId = user.id;
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.form.patchValue({
      matricule: user.matricule,
      phone: user.phone,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role ?? 'AGENT',
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.form.reset({ role: 'AGENT' });
  }

  save() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const val = this.form.value;

    if (this.isNew) {
      const payload = { ...this.form.getRawValue(), type: 'AGENT' } as any;
      this.userService.create(payload).subscribe({
        next: () => { this.saving = false; this.showSuccess('Utilisateur créé avec succès !'); this.closeModal(); this.loadUsers(); },
        error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la création.'; }
      });
    } else {
      const payload = { phone: val.phone, firstName: val.firstName, lastName: val.lastName, email: val.email, role: val.role };
      this.userService.update(this.editingId!, payload as any).subscribe({
        next: () => { this.saving = false; this.showSuccess('Utilisateur modifié avec succès !'); this.closeModal(); this.loadUsers(); },
        error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la modification.'; }
      });
    }
  }

  archive(user: UserModel) {
    this.userService.archive(user.id).subscribe({
      next: () => { this.showSuccess('Utilisateur archivé.'); this.loadUsers(); }
    });
  }

  unarchive(user: UserModel) {
    this.userService.unarchive(user.id).subscribe({
      next: () => { this.showSuccess('Utilisateur désarchivé.'); this.loadUsers(); }
    });
  }

  deleteUser(user: UserModel) {
    if (!confirm(`Supprimer ${user.firstName} ${user.lastName} ? Cette action est irréversible.`)) return;
    this.userService.delete(user.id).subscribe({
      next: () => { this.showSuccess('Utilisateur supprimé.'); this.loadUsers(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la suppression.'; }
    });
  }

  roleLabel(role?: string): string {
    const labels: Record<string, string> = {
      SUPER_AGENT: 'Super Agent',
      AGENT: 'Agent',
      CHEF_ATELIER: 'Chef Atelier',
      AGENT_MAGASIN: 'Agent Magasin',
    };
    return role ? (labels[role] ?? role) : '–';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get f() { return this.form.controls; }
}
