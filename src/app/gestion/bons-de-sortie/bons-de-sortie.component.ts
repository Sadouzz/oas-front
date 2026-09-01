import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';

import { FormBuilder, FormArray, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BonDeSortieService, BonDeSortie, BonDeSortieHistorique } from '../../services/bon-de-sortie.service';
import { ClientService, UserModel } from '../../services/client.service';
import { VehiculeService, VehiculeModel } from '../../services/vehicule.service';
import { PieceDetacheeService, PieceDetache } from '../../services/piece-detachee.service';
import { AuthService } from '../auth/services/auth.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LucidePlus, LucideSearch, LucidePackage, LucideTrash2, LucideX, LucideCheck, LucideCheckCircle, LucideLoader2 } from '@lucide/angular';

@Component({
  selector: 'app-bons-de-sortie',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, PaginationComponent, AlertComponent, LucidePlus, LucideSearch, LucidePackage, LucideTrash2, LucideX, LucideCheck, LucideCheckCircle, LucideLoader2],
  templateUrl: './bons-de-sortie.component.html',
})
export class BonsDeSortieComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
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
  allVehicules: VehiculeModel[] = [];
  vehiculesFiltres: VehiculeModel[] = [];
  pdps: PieceDetache[] = [];

  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  historique: BonDeSortieHistorique[] = [];
  loadingHistorique = false;

  showCreateModal = false;
  showDetailModal = false;
  selectedBon: BonDeSortie | null = null;

  createStep = 1;

  clientOpen = false;
  vehiculeOpen = false;
  clientFilter = '';
  vehiculeFilter = '';

  filterStatut = '';
  searchTerm = '';
  dateDebut = '';
  dateFin = '';
  filterVehicule = '';
  showDateFilter = false;

  form = this.fb.group({
    clientId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null, Validators.required],
    remarque: [''],
    lignesPieces: this.fb.array([]),
  });

  get lignesPieces(): FormArray { return this.form.get('lignesPieces') as FormArray; }

  get role(): string { return this.authService.getRole() ?? ''; }
  get canCreate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT', 'ROLE_AGENT_MAGASIN'].includes(this.role); }
  get canValidate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT_MAGASIN'].includes(this.role); }

  // ── Searchable selects ──────────────────────────────────────────

  get clientLabel(): string {
    const id = this.form.get('clientId')?.value;
    if (!id) return '';
    const c = this.clients.find(x => x.id === Number(id));
    return c ? `${c.firstName} ${c.lastName}` : '';
  }

  get vehiculeLabel(): string {
    const id = this.form.get('vehiculeId')?.value;
    if (!id) return '';
    const v = this.allVehicules.find(x => x.id === Number(id));
    return v ? `${v.immatriculation} — ${v.marque} ${v.modele}` : '';
  }

  get filteredClients(): UserModel[] {
    if (!this.clientFilter) return this.clients;
    const kw = this.clientFilter.toLowerCase();
    return this.clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(kw) ||
      (c.phone ?? '').toLowerCase().includes(kw)
    );
  }

  get filteredVehicules(): VehiculeModel[] {
    if (!this.vehiculeFilter) return this.vehiculesFiltres;
    const kw = this.vehiculeFilter.toLowerCase();
    return this.vehiculesFiltres.filter(v =>
      v.immatriculation.toLowerCase().includes(kw) ||
      `${v.marque} ${v.modele}`.toLowerCase().includes(kw)
    );
  }

  selectClient(c: UserModel) {
    this.form.patchValue({ clientId: c.id, vehiculeId: null });
    this.vehiculesFiltres = this.allVehicules.filter(v => v.client?.id === c.id);
    this.clientFilter = '';
    this.clientOpen = false;
  }

  selectVehicule(v: VehiculeModel) {
    this.form.patchValue({ vehiculeId: v.id });
    this.vehiculeFilter = '';
    this.vehiculeOpen = false;
  }

  // ── Lifecycle ───────────────────────────────────────────────────

  ngOnInit() {
    this.loadBons();
    forkJoin({
      clients: this.clientService.getAll(),
      vehicules: this.vehiculeService.getAll(),
      pdps: this.pieceService.getAll({ type: 'PDP' })
    }).subscribe({
      next: ({ clients, vehicules, pdps }) => {
        this.clients = clients.filter(c => c.enabled);
        this.allVehicules = vehicules;
        this.pdps = pdps.filter(p => p.statut === 'ACTIF');
      },
    });

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openCreate();
      }
      if (params['statut']) {
        this.filterStatut = params['statut'];
      } else if (!params['action']) {
        this.filterStatut = '';
      }
      if (params['search'] === 'auto-date') {
        this.showDateFilter = true;
      }
      this.applyFilter(); this.cdr.markForCheck();
    });
  }

  loadBons() {
    this.loading = true;
    this.bonService.getAll().subscribe({
      next: (d) => { this.bons = d.sort((a: any, b: any) => b.id - a.id); this.applyFilter(); this.cdr.markForCheck(); this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  applyFilter() {
    let data = this.bons;
    if (this.filterStatut) data = data.filter(b => b.statut === this.filterStatut);
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      data = data.filter(b =>
        (b.reference ?? '').toLowerCase().includes(kw) ||
        `${b.client?.firstName ?? ''} ${b.client?.lastName ?? ''}`.toLowerCase().includes(kw) ||
        (b.vehicule?.immatriculation ?? '').toLowerCase().includes(kw)
      );
    }
    if (this.dateDebut) {
      data = data.filter(b => b.date && b.date >= this.dateDebut);
    }
    if (this.dateFin) {
      data = data.filter(b => b.date && b.date.slice(0, 10) <= this.dateFin);
    }
    if (this.filterVehicule) {
      const vKw = this.filterVehicule.toLowerCase();
      data = data.filter(b =>
        (b.vehicule?.immatriculation ?? '').toLowerCase().includes(vKw) ||
        (b.vehicule?.marque ?? '').toLowerCase().includes(vKw) ||
        (b.vehicule?.modele ?? '').toLowerCase().includes(vKw)
      );
    }
    this.filtered = data;
    this.page = 1;
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter(); this.cdr.markForCheck();
  }

  get paged(): BonDeSortie[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  onStatutFilter(event: Event) {
    this.filterStatut = (event.target as HTMLSelectElement).value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  // ── WIZARD ─────────────────────────────────────────────────────

  openCreate() {
    this.form.reset({ remarque: '' });
    while (this.lignesPieces.length) this.lignesPieces.removeAt(0);
    this.addPiece();
    this.vehiculesFiltres = [];
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.createStep = 1;
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  closeCreate() { this.showCreateModal = false; this.errorMessage = ''; this.createStep = 1; }

  goStep(n: number) {
    if (n === 2) {
      if (this.form.get('clientId')!.invalid || this.form.get('vehiculeId')!.invalid) {
        this.form.get('clientId')!.markAsTouched();
        this.form.get('vehiculeId')!.markAsTouched();
        this.errorMessage = 'Veuillez selectionner un client et un vehicule.';
        return;
      }
    }
    this.createStep = n;
    this.errorMessage = '';
  }

  // ── Lignes pieces ──

  addPiece() {
    this.lignesPieces.push(this.fb.group({
      pieceId: [null as number | null],
      pieceRef: [''],
      quantite: [1, [Validators.required, Validators.min(1)]],
      prix: [null as number | null],
    }));
  }

  removePiece(i: number) { if (this.lignesPieces.length > 1) this.lignesPieces.removeAt(i); }

  onPieceInput(index: number, event: Event) {
    const ref = (event.target as HTMLInputElement).value.trim();
    const found = this.pdps.find(p => p.reference === ref);
    const ctrl = this.lignesPieces.at(index);
    if (found) {
      ctrl.patchValue({ pieceId: found.id, prix: found.prix ?? null }, { emitEvent: false });
    } else {
      ctrl.patchValue({ pieceId: null }, { emitEvent: false });
    }
  }

  save() {
    const val = this.form.value as any;
    const lignesPieces = (val.lignesPieces ?? [])
      .filter((l: any) => l.pieceId)
      .map((l: any) => ({ pieceId: l.pieceId, quantite: l.quantite, prix: l.prix }));

    if (lignesPieces.length === 0) {
      this.errorMessage = 'Ajoutez au moins une piece.';
      return;
    }
    if (this.form.get('clientId')!.invalid || this.form.get('vehiculeId')!.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;

    this.bonService.creer({
      clientId: val.clientId,
      vehiculeId: val.vehiculeId,
      remarque: val.remarque,
      lignesPieces
    } as any).subscribe({
      next: () => { this.saving = false; this.showSuccess('Bon de sortie cree !'); this.closeCreate(); this.loadBons(); },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors de la creation.';
      }
    });
  }

  openDetail(bon: BonDeSortie) {
    this.selectedBon = bon;
    this.showDetailModal = true;
    this.loadHistorique(bon.id);
  }
  closeDetail() {
    this.showDetailModal = false;
    this.selectedBon = null;
    this.historique = [];
  }

  loadHistorique(bonId: number) {
    this.loadingHistorique = true;
    this.bonService.getHistorique(bonId).subscribe({
      next: (h) => { this.historique = h; this.loadingHistorique = false; },
      error: () => { this.loadingHistorique = false; }
    });
  }

  retournerPiece(pieceId: number) {
    if (!this.selectedBon) return;
    if (!confirm('Voulez-vous retirer cette pièce du bon de sortie ? La quantité sera recréditée au stock magasin.')) return;
    if (this.saving) return;
    this.saving = true;
    this.bonService.retournerPiece(this.selectedBon.id, pieceId).subscribe({
      next: (updatedBon) => {
        this.saving = false;
        this.selectedBon = updatedBon;
        this.showSuccess('Pièce retournée avec succès au stock magasin.');
        this.loadBons();
        this.loadHistorique(updatedBon.id);
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors du retour de pièce.';
      }
    });
  }

  valider(bon: BonDeSortie) {
    if (!confirm(`Valider le bon ${bon.reference} ? Les pièces seront déduites de l'atelier.`)) return;
    if (this.saving) return;
    this.saving = true;
    this.bonService.valider(bon.id).subscribe({
      next: () => { this.saving = false; this.showSuccess(`Bon ${bon.reference} validé !`); this.loadBons(); this.closeDetail(); },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors de la validation.';
      }
    });
  }

  statutClass(statut: string): string {
    return statut === 'VALIDE' ? 'bg-oas-ok-bg text-oas-ok' : 'bg-oas-warn-bg text-oas-warn';
  }

  statutHistoriqueClass(statut: string): string {
    switch (statut) {
      case 'SORTIE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SORTIE ATELIER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RETOUR':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  formatDate(d: string): string { return new Date(d).toLocaleString('fr-FR'); }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get fPieces() { return this.lignesPieces.controls; }
}
