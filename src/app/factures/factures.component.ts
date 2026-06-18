import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NgClass } from '@angular/common';
import { FactureService } from '../services/facture.service';
import { FactureModel, FactureCreateRequest } from '../shared/models/facture.model';
import { ClientService, UserModel } from '../services/client.service';
import { VehiculeService, VehiculeModel } from '../services/vehicule.service';
import { BonDeCommandeService, BonDeCommande } from '../services/bon-de-commande.service';
import { PieceDetacheeService, PieceDetache } from '../services/piece-detachee.service';
import { MainDoeuvreService, MainDoeuvreModel } from '../services/main-doeuvre.service';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './factures.component.html',
})
export class FacturesComponent implements OnInit {
  private service = inject(FactureService);
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private bonDeCommandeService = inject(BonDeCommandeService);
  private pieceService = inject(PieceDetacheeService);
  private mainDoeuvreService = inject(MainDoeuvreService);

  factures: FactureModel[] = [];
  filtered: FactureModel[] = [];
  loading = true;
  saving = false;
  selectedFacture: FactureModel | null = null;
  showCreateModal = false;
  createStep = 1;

  clients: UserModel[] = [];
  vehiculesFiltres: VehiculeModel[] = [];
  bonsDeCommande: BonDeCommande[] = [];
  pdps: PieceDetache[] = [];
  mainDoeuvres: MainDoeuvreModel[] = [];

  clientOpen = false;
  vehiculeOpen = false;
  clientFilter = '';
  vehiculeFilter = '';


  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  successMessage = '';
  errorMessage = '';

  form = this.fb.group({
    clientId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null, Validators.required],
    kilometrage: [null as number | null],
    remarque: [''],
    bonDeCommandeId: [null as number | null],
    appliquerTVA: [false],
    appliquerTimbre: [false],
    modePaiement: ['ESPECE', Validators.required],
    lignesPieces: this.fb.array([]),
    lignesMainDoeuvres: this.fb.array([]),
  });

  get lignesPieces(): FormArray { return this.form.get('lignesPieces') as FormArray; }
  get lignesMainDoeuvres(): FormArray { return this.form.get('lignesMainDoeuvres') as FormArray; }

  ngOnInit() {
    this.load();
    forkJoin({
      clients: this.clientService.getAll(),
      bons: this.bonDeCommandeService.getAll(),
      mainDoeuvres: this.mainDoeuvreService.getAll(),
    }).subscribe({
      next: ({ clients, bons, mainDoeuvres }) => {
        this.clients = clients.filter(c => c.enabled);
        this.bonsDeCommande = bons.filter(b => b.statut !== 'ANNULE');
        this.mainDoeuvres = mainDoeuvres.filter(m => !m.isArchived);
      },
    });
    this.pieceService.getAll({ type: 'PDP' }).subscribe({
      next: (d) => { this.pdps = d.filter(p => p.statut === 'ACTIF'); },
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.factures = data.sort((a:any, b:any) => b.id - a.id); this.applyFilter(); this.loading = false; },
      error: () => this.loading = false,
    });
  }

  applyFilter() {
    if (!this.searchTerm) { this.filtered = this.factures; this.page = 1; return; }
    const kw = this.searchTerm;
    this.filtered = this.factures.filter(f =>
      f.numero.toLowerCase().includes(kw) ||
      f.clientNom.toLowerCase().includes(kw) ||
      (f.immatriculation ?? '').toLowerCase().includes(kw)
    );
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  // ── Wizard ─────────────────────────────────────────────────────

  openCreate() {
    this.form.reset({ remarque: '', appliquerTVA: false, appliquerTimbre: false, modePaiement: 'ESPECE' });
    while (this.lignesPieces.length) this.lignesPieces.removeAt(0);
    while (this.lignesMainDoeuvres.length) this.lignesMainDoeuvres.removeAt(0);
    this.vehiculesFiltres = [];
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.createStep = 1;
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  closeCreate() {
    this.showCreateModal = false;
    this.errorMessage = '';
    this.createStep = 1;
  }

  goStep(n: number) {
    this.errorMessage = '';
    if (n > this.createStep && this.createStep === 1) {
      const clientCtrl = this.form.get('clientId')!;
      const vehiculeCtrl = this.form.get('vehiculeId')!;
      if (!clientCtrl.value || !vehiculeCtrl.value) {
        clientCtrl.markAsTouched();
        vehiculeCtrl.markAsTouched();
        this.errorMessage = 'Veuillez sélectionner un client et un véhicule.';
        return;
      }
    }
    this.createStep = n;
  }

  // ── Step 1 helpers ─────────────────────────────────────────────

  get clientLabel(): string {
    const id = this.form.get('clientId')?.value;
    if (!id) return '';
    const c = this.clients.find(x => x.id === Number(id));
    return c ? `${c.firstName} ${c.lastName}` : '';
  }

  get vehiculeLabel(): string {
    const id = this.form.get('vehiculeId')?.value;
    if (!id) return '';
    const v = this.vehiculesFiltres.find(x => x.id === Number(id));
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
    this.vehiculesFiltres = [];
    this.clientFilter = '';
    this.clientOpen = false;
    this.vehiculeService.getByClient(c.id).subscribe({
      next: (d) => { this.vehiculesFiltres = d; },
    });
  }

  selectVehicule(v: VehiculeModel) {
    this.form.patchValue({ vehiculeId: v.id });
    this.vehiculeFilter = '';
    this.vehiculeOpen = false;
  }

  // ── Step 3 helpers ─────────────────────────────────────────────

  get filteredPdps(): PieceDetache[] {
    return this.pdps;
  }

  addPiece() {
    this.lignesPieces.push(this.fb.group({
      pieceId: [null as number | null],
      quantite: [1, [Validators.required, Validators.min(1)]],
    }));
  }

  removePiece(i: number) { this.lignesPieces.removeAt(i); }

  addMainDoeuvre() {
    this.lignesMainDoeuvres.push(this.fb.group({
      mainDoeuvreId: [null as number | null],
      nbreHeure: [1, [Validators.required, Validators.min(1)]],
    }));
  }

  removeMainDoeuvre(i: number) { this.lignesMainDoeuvres.removeAt(i); }

  moLabel(mo: MainDoeuvreModel): string {
    return `${mo.categorie} — ${mo.nbreHeure}h — ${this.fmt(mo.prix)} FCFA/h`;
  }

  getPrixPDP(pieceId: number | null): number {
    if (!pieceId) return 0;
    return this.pdps.find(p => p.id === Number(pieceId))?.prix ?? 0;
  }

  getPrixMO(moId: number | null): number {
    if (!moId) return 0;
    return this.mainDoeuvres.find(m => m.id === Number(moId))?.prix ?? 0;
  }

  get montantHTForm(): number {
    const pieces = this.lignesPieces.controls.reduce((sum, c) => {
      return sum + this.getPrixPDP(c.get('pieceId')?.value) * (Number(c.get('quantite')?.value) || 0);
    }, 0);
    const mos = this.lignesMainDoeuvres.controls.reduce((sum, c) => {
      return sum + this.getPrixMO(c.get('mainDoeuvreId')?.value) * (Number(c.get('nbreHeure')?.value) || 0);
    }, 0);
    return pieces + mos;
  }

  get montantTVAForm(): number {
    return this.form.get('appliquerTVA')?.value ? Math.round(this.montantHTForm * 0.18) : 0;
  }

  get montantTimbreForm(): number {
    return this.form.get('appliquerTimbre')?.value ? 200 : 0;
  }

  get montantTTCForm(): number { return this.montantHTForm + this.montantTVAForm; }
  get montantTotalForm(): number { return this.montantTTCForm + this.montantTimbreForm; }

  // ── Save ────────────────────────────────────────────────────────

  save() {
    if (this.saving) return;
    const val = this.form.value as any;

    if (!val.modePaiement) {
      this.form.get('modePaiement')!.markAsTouched();
      this.errorMessage = 'Veuillez choisir un mode de paiement.';
      return;
    }

    const lignesPieces = (val.lignesPieces ?? [])
      .filter((l: any) => l.pieceId)
      .map((l: any) => ({ pieceId: Number(l.pieceId), quantite: Number(l.quantite) }));

    const lignesMainDoeuvres = (val.lignesMainDoeuvres ?? [])
      .filter((l: any) => l.mainDoeuvreId)
      .map((l: any) => ({ mainDoeuvreId: Number(l.mainDoeuvreId), nbreHeure: Number(l.nbreHeure) }));

    this.saving = true;
    this.errorMessage = '';

    const request: FactureCreateRequest = {
      clientId: Number(val.clientId),
      vehiculeId: Number(val.vehiculeId),
      kilometrage: val.kilometrage ?? 0,
      remarque: val.remarque || null,
      bonDeCommandeId: val.bonDeCommandeId ? Number(val.bonDeCommandeId) : null,
      lignesPieces,
      lignesMainDoeuvres,
      appliquerTVA: !!val.appliquerTVA,
      appliquerTimbre: !!val.appliquerTimbre,
      modePaiement: val.modePaiement,
    };

    this.service.create(request).subscribe({
      next: () => {
        this.saving = false;
        this.closeCreate();
        this.load();
        this.notify('Facture créée avec succès !');
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors de la création de la facture.';
      },
    });
  }

  // ── Detail ──────────────────────────────────────────────────────

  openDetail(f: FactureModel) { this.selectedFacture = f; }
  closeDetail() { this.selectedFacture = null; }

  delete(id: number) {
    if (!confirm('Supprimer cette facture ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Facture supprimée.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  downloadPdf(id: number) {
    this.service.downloadPdf(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  modePaiementLabel(mp: string | null | undefined): string {
    const m: Record<string, string> = { CHEQUE: 'Chèque', ESPECE: 'Espèces', HORS_TAXE: 'Hors taxe' };
    return m[mp ?? ''] ?? mp ?? '—';
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): FactureModel[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  private notify(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
