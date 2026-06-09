import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { BonDeSortieService, BonDeSortie } from '../services/bon-de-sortie.service';
import { ClientService, UserModel } from '../services/client.service';
import { VehiculeService, VehiculeModel } from '../services/vehicule.service';
import { PieceDetacheeService, PieceDetache } from '../services/piece-detachee.service';
import { MainDoeuvreService, MainDoeuvreModel } from '../services/main-doeuvre.service';
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
  private mainDoeuvreService = inject(MainDoeuvreService);
  private authService = inject(AuthService);

  bons: BonDeSortie[] = [];
  filtered: BonDeSortie[] = [];
  page = 1;
  readonly pageSize = 10;
  clients: UserModel[] = [];
  vehicules: VehiculeModel[] = [];
  vehiculesFiltres: VehiculeModel[] = [];
  pdps: PieceDetache[] = [];
  mainDoeuvres: MainDoeuvreModel[] = [];

  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showCreateModal = false;
  showDetailModal = false;
  selectedBon: BonDeSortie | null = null;

  // 3-step wizard
  createStep = 1;

  filterStatut = '';
  searchTerm = '';

  form = this.fb.group({
    clientId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null, Validators.required],
    remarque: [''],
    lignesPieces: this.fb.array([]),
    lignesMainDoeuvres: this.fb.array([]),
  });

  get lignesPieces(): FormArray { return this.form.get('lignesPieces') as FormArray; }
  get lignesMainDoeuvres(): FormArray { return this.form.get('lignesMainDoeuvres') as FormArray; }

  get role(): string { return this.authService.getRole() ?? ''; }
  get canCreate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_AGENT', 'ROLE_AGENT_MAGASIN'].includes(this.role); }
  get canValidate(): boolean { return ['ROLE_SUPER_AGENT', 'ROLE_CHEF_ATELIER'].includes(this.role); }

  ngOnInit() {
    this.loadBons();
    this.clientService.getAll().subscribe({ next: (d) => { this.clients = d.filter(c => c.enabled); } });
    this.pieceService.getAll({ type: 'PDP', statut: 'ACTIF' }).subscribe({ next: (d) => { this.pdps = d; } });
    this.mainDoeuvreService.getAll().subscribe({ next: (d) => { this.mainDoeuvres = d.filter(m => !m.isArchived); } });
  }

  loadBons() {
    this.loading = true;
    this.bonService.getAll().subscribe({
      next: (d) => { this.bons = d; this.applyFilter(); this.loading = false; },
      error: () => { this.loading = false; }
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
    this.filtered = data;
    this.page = 1;
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
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

  // ── WIZARD ─────────────────────────────────────────────────────

  openCreate() {
    this.form.reset({ remarque: '' });
    while (this.lignesPieces.length) this.lignesPieces.removeAt(0);
    while (this.lignesMainDoeuvres.length) this.lignesMainDoeuvres.removeAt(0);
    this.addPiece();
    this.vehiculesFiltres = [];
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
        return;
      }
    }
    this.createStep = n;
    this.errorMessage = '';
  }

  // ── Lignes pièces ──
  addPiece() {
    this.lignesPieces.push(this.fb.group({
      pieceId: [null as number | null, Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
    }));
  }

  removePiece(i: number) { if (this.lignesPieces.length > 1) this.lignesPieces.removeAt(i); }

  // ── Lignes main d'oeuvre ──
  addMainDoeuvre() {
    this.lignesMainDoeuvres.push(this.fb.group({
      mainDoeuvreId: [null as number | null, Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
    }));
  }

  removeMainDoeuvre(i: number) { this.lignesMainDoeuvres.removeAt(i); }

  save() {
    const hasPieces = this.lignesPieces.length > 0 && this.lignesPieces.controls.some(l => l.get('pieceId')?.value);
    const hasMd = this.lignesMainDoeuvres.length > 0 && this.lignesMainDoeuvres.controls.some(l => l.get('mainDoeuvreId')?.value);
    if (!hasPieces && !hasMd) {
      this.errorMessage = 'Ajoutez au moins une pièce ou une main d\'œuvre.';
      return;
    }
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value as any;

    const lignesPieces = (val.lignesPieces ?? []).filter((l: any) => l.pieceId);
    const lignesMainDoeuvres = (val.lignesMainDoeuvres ?? []).filter((l: any) => l.mainDoeuvreId);

    this.bonService.creer({
      clientId: val.clientId,
      vehiculeId: val.vehiculeId,
      remarque: val.remarque,
      lignesPieces,
      lignesMainDoeuvres,
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
    return statut === 'VALIDE' ? 'bg-oas-ok-bg text-oas-ok' : 'bg-oas-warn-bg text-oas-warn';
  }

  formatDate(d: string): string { return new Date(d).toLocaleString('fr-FR'); }

  mainDoeuvreLabel(item: MainDoeuvreModel): string {
    const cat = (item as any).categorie?.nom ?? '';
    return cat ? `${cat} — ${item.nbreHeure}h (${item.prix?.toLocaleString('fr-FR')} FCFA)` : `${item.nbreHeure}h — ${item.prix?.toLocaleString('fr-FR')} FCFA`;
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get fPieces() { return this.lignesPieces.controls; }
  get fMd() { return this.lignesMainDoeuvres.controls; }
}
