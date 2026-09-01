import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserManagementService } from '../../../services/user-management.service';
import { GarageService } from '../../../services/garage.service';
import { UserModel } from '../../../shared/models/index';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideUser, LucideCheck, LucideArchive } from '@lucide/angular';
import { AuthService } from '../../auth/services/auth.service';

const ROLES = ['SUPER_AGENT', 'MASTER', 'AGENT', 'CHEF_ATELIER', 'AGENT_MAGASIN'] as const;

const ROLE_PREFIX: Record<string, string> = {
  SUPER_AGENT: 'SAD',
  MASTER: 'MAS',
  AGENT: 'AGT',
  CHEF_ATELIER: 'CHF',
  AGENT_MAGASIN: 'MAG',
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, PaginationComponent, LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideArchive],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private userService = inject(UserManagementService);
  private garageService = inject(GarageService);
  private authService = inject(AuthService);
  
  get isSuperAgent(): boolean { return this.authService.getRole() === 'ROLE_SUPER_AGENT'; }

  users: UserModel[] = [];
  filtered: UserModel[] = [];
  garages: any[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showModal = false;
  isNew = false;
  editingId: number | null = null;

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
    garageId: [null as number | null],
  });

  get generatedMatricule(): string {
    return this.form.getRawValue().matricule ?? '';
  }

  ngOnInit() {
    this.loadUsers();
    this.loadGarages();
  }

  loadGarages() {
    if (this.isSuperAgent) {
      this.garageService.getAll().subscribe({
        next: (data) => this.garages = data,
        error: (err) => console.error('Erreur lors du chargement des garages', err)
      });
    }
  }

  loadUsers() {
    this.loading = true;
    this.userService.getAll().subscribe({
      next: (data) => {
        this.users = data.filter(u => u.type === 'AGENT');
        this.filtered = this.users;
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  private nextMatricule(prefix: string): string {
    const p = `${prefix}-`;
    const nums = this.users
      .map(u => u.matricule?.startsWith(p) ? parseInt(u.matricule.slice(p.length), 10) : NaN)
      .filter(n => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `${p}${String(next).padStart(5, '0')}`;
  }

  private refreshMatricule() {
    const role = this.form.get('role')?.value ?? 'AGENT';
    const prefix = ROLE_PREFIX[role] ?? 'USR';
    this.form.get('matricule')?.setValue(this.nextMatricule(prefix));
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.filtered = term
      ? this.users.filter(u =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.matricule.toLowerCase().includes(term) ||
          u.username.toLowerCase().includes(term)
        )
      : this.users;
    this.page = 1;
  }

  get paged(): UserModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset({ role: 'AGENT', garageId: null });
    this.form.get('password')?.setValidators(Validators.required);
    this.form.get('password')?.updateValueAndValidity();
    this.refreshMatricule();
    this.form.get('role')?.valueChanges.subscribe(() => this.refreshMatricule());
    this.showModal = true;
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
      role: this.effectiveRole(user) || 'AGENT',
      garageId: user.garage?.id || null,
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.form.reset({ role: 'AGENT', garageId: null });
    this.errorMessage = '';
  }

  save() {
    const raw = this.form.getRawValue();
    const editControls = ['phone', 'firstName', 'lastName', 'email', 'role'];
    const createControls = [...editControls, 'username', 'password'];
    const requiredKeys = this.isNew ? createControls : editControls;
    const anyEmpty = requiredKeys.some(k => !raw[k as keyof typeof raw]);
    if (anyEmpty || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;

    if (this.isNew) {
      const payload = { ...raw, type: 'AGENT' } as any;
      if (!payload.garageId) delete payload.garageId;
      this.userService.create(payload).subscribe({
        next: () => { this.saving = false; this.showSuccess('Utilisateur créé avec succès !'); this.closeModal(); this.loadUsers(); },
        error: (err: any) => { this.saving = false; this.errorMessage = this.parseError(err); }
      });
    } else {
      const payload: any = { phone: raw.phone, firstName: raw.firstName, lastName: raw.lastName, email: raw.email, role: raw.role };
      if (raw.garageId) payload.garageId = raw.garageId;
      this.userService.update(this.editingId!, payload as any).subscribe({
        next: () => { this.saving = false; this.showSuccess('Utilisateur modifié avec succès !'); this.closeModal(); this.loadUsers(); },
        error: (err: any) => { this.saving = false; this.errorMessage = this.parseError(err); }
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

  effectiveRole(user: UserModel): string {
    if (user.role) return user.role;
    const auth = user.authorities?.[0]?.authority;
    return auth ? auth.replace(/^ROLE_/, '') : '';
  }

  roleLabel(roleOrUser: string | UserModel | undefined): string {
    const labels: Record<string, string> = {
      SUPER_AGENT: 'Super Agent',
      MASTER: 'Master',
      AGENT: 'Agent',
      CHEF_ATELIER: 'Chef Atelier',
      AGENT_MAGASIN: 'Agent Magasin',
    };
    const role = typeof roleOrUser === 'object' && roleOrUser !== null
      ? this.effectiveRole(roleOrUser)
      : roleOrUser;
    return role ? (labels[role] ?? role) : '–';
  }

  private parseError(err: any): string {
    const raw: string = err?.error?.message ?? (typeof err?.error === 'string' ? err.error : '');
    if (!raw) return 'Une erreur est survenue.';
    const lower = raw.toLowerCase();
    if (lower.includes('email') && (lower.includes('déjà') || lower.includes('already') || lower.includes('duplicate') || lower.includes('unique'))) return 'Cet email est déjà utilisé par un autre compte.';
    if ((lower.includes('username') || lower.includes('identifiant')) && (lower.includes('déjà') || lower.includes('already'))) return 'Cet identifiant est déjà utilisé par un autre compte.';
    if (lower.includes('phone') || lower.includes('téléphone')) return 'Ce numéro de téléphone est déjà utilisé.';
    if (lower.includes('matricule')) return 'Ce matricule est déjà utilisé.';
    if (lower.includes('duplicate') || lower.includes('unique') || lower.includes('constraint') || lower.includes('23505')) return 'Une valeur unique (email, identifiant ou téléphone) est déjà utilisée par un autre compte.';
    if (raw.length < 200 && !raw.includes('Exception') && !raw.includes('Statement')) return raw;
    return 'Une erreur est survenue lors de la création.';
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get f() { return this.form.controls; }
}
