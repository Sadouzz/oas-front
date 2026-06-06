import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { BonDeSortieService, BonDeSortie } from '../services/bon-de-sortie.service';
import { ClientService, UserModel } from '../services/client.service';
import { VehiculeService, VehiculeModel } from '../services/vehicule.service';
import { PieceDetacheeService, PieceDetache } from '../services/piece-detachee.service';
import { AuthService } from '../auth/services/auth.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-bons-de-sortie',
  standalone: true,
  imports: [ReactiveFormsModule, AlertComponent, PaginationComponent],
  templateUrl: './bons-de-sortie.component.html',
})
export class BonsDeSortieComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bonService = inject(BonDeSortieService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private authService = inject(AuthService);

  bons: BonDeSortie[] = [];
  filtered: BonDeSortie[] = [];
  page = 1;
  readonly pageSize = 10;
  clients: UserModel[] = [];
  vehicules: VehiculeModel[] = [];
  vehiculesFiltres: VehiculeModel[] = [];
  pdps: PieceDetache[] = [];

  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showCreateModal = false;
  showDetailModal = false;
  selectedBon: BonDeSortie | null = null;

  filterStatut = '';

  form = this.fb.group({
    clientId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null, Validators.required],
    remarque: [''],
    lignes: this.fb.array([]),
  });

  get lignes(): FormArray { return this.form.get('lignes') as FormArray; }

  get role(): string { return this.authService.getRole() ?? ''; }
  get canCreate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_AGENT', 'ROLE_AGENT_MAGASIN'].includes(this.role); }
  get canValidate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_CHEF_ATELIER'].includes(this.role); }

  ngOnInit() {
    this.loadBons();
    this.clientService.getAll().subscribe({ next: (d) => { this.clients = d.filter(c => c.enabled); } });
    this.pieceService.getAll({ type: 'PDP', statut: 'ACTIF' }).subscribe({ next: (d) => { this.pdps = d; } });
  }

  loadBons() {
    this.loading = true;
    this.bonService.getAll().subscribe({
      next: (d) => { this.bons = d; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  applyFilter() {
    this.filtered = this.filterStatut
      ? this.bons.filter(b => b.statut === this.filterStatut)
      : this.bons;
    this.page = 1;
  }

  get paged(): BonDeSortie[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  onStatutFilter(event: Event) {
    this.filterStatut = (event.target as HTMLSelectElement).value;
    this.applyFilter();
  }

  onClientChange(event: Event) {
    const clientId = Number((event.target as HTMLSelectElement).value);
    this.form.patchValue({ vehiculeId: null });
    this.vehiculesFiltres = [];
    if (clientId) {
      this.vehiculeService.getByClient(clientId).subscribe({
        next: (d) => { this.vehiculesFiltres = d; }
      });
    }
  }

  openCreate() {
    this.form.reset({ remarque: '' });
    while (this.lignes.length) this.lignes.removeAt(0);
    this.addLigne();
    this.vehiculesFiltres = [];
    this.showCreateModal = true;
  }

  closeCreate() { this.showCreateModal = false; this.errorMessage = ''; }

  addLigne() {
    this.lignes.push(this.fb.group({
      pieceId: [null as number | null, Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
    }));
  }

  removeLigne(i: number) { if (this.lignes.length > 1) this.lignes.removeAt(i); }

  save() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value as any;
    this.bonService.creer({
      clientId: val.clientId,
      vehiculeId: val.vehiculeId,
      remarque: val.remarque,
      lignes: val.lignes,
    }).subscribe({
      next: () => { this.saving = false; this.showSuccess('Bon de sortie créé avec succès !'); this.closeCreate(); this.loadBons(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la création.'; }
    });
  }

  openDetail(bon: BonDeSortie) { this.selectedBon = bon; this.showDetailModal = true; }
  closeDetail() { this.showDetailModal = false; this.selectedBon = null; }

  valider(bon: BonDeSortie) {
    if (!confirm(`Valider le bon ${bon.reference} ? Les stocks seront mis à jour.`)) return;
    if (this.saving) return;
    this.saving = true;
    this.bonService.valider(bon.id).subscribe({
      next: () => { this.saving = false; this.showSuccess(`Bon ${bon.reference} validé !`); this.loadBons(); this.closeDetail(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la validation.'; }
    });
  }

  statutClass(statut: string): string {
    return statut === 'VALIDE'
      ? 'bg-green-100 text-green-800'
      : 'bg-amber-100 text-amber-800';
  }

  formatDate(d: string): string { return new Date(d).toLocaleString('fr-FR'); }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get fLignes() { return this.lignes.controls; }
}
