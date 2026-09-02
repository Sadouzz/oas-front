import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CommonModule, DecimalPipe, DatePipe, NgClass } from '@angular/common';
import { NoteDePrixService } from './note-de-prix.service';
import { NoteDePrixModel, NoteDePrixCreateRequest } from './models/note-de-prix.model';
import { ClientService, UserModel } from '../clients/client.service';
import { VehiculeService, VehiculeModel } from '../vehicules/vehicule.service';
import { OrdreReparationService, OrdreReparation } from '../ordres-reparation/ordre-reparation.service';
import { LucideSearch, LucidePlus, LucideTrash2, LucideX, LucideDownload, LucideReceipt } from '@lucide/angular';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-notes-prix',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgClass, PaginationComponent, LucideSearch, LucidePlus, LucideTrash2, LucideX, LucideReceipt],
  templateUrl: './notes-prix.component.html',
})
export class NotesPrixComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(NoteDePrixService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private ficheService = inject(OrdreReparationService);

  notes: NoteDePrixModel[] = [];
  filtered: NoteDePrixModel[] = [];
  loading = true;
  saving = false;
  selectedNote: NoteDePrixModel | null = null;
  showCreateModal = false;
  createStep = 1;

  showPayModal = false;
  noteToPay: NoteDePrixModel | null = null;
  payMontant = 0;
  payMethode = 'ESPECE';
  paySaving = false;

  clients: UserModel[] = [];
  vehiculesFiltres: VehiculeModel[] = [];
  ordresReparation: OrdreReparation[] = [];
  fichesFiltrees: OrdreReparation[] = [];

  clientOpen = false;
  vehiculeOpen = false;
  ficheOpen = false;
  clientFilter = '';
  vehiculeFilter = '';
  ficheFilter = '';

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  filterStatut = '';
  dateDebut = '';
  dateFin = '';
  filterClient = '';
  showDateFilter = false;
  successMessage = '';
  errorMessage = '';

  form = this.fb.group({
    clientId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null, Validators.required],
    ordreReparationId: [null as number | null, Validators.required],
    kilometrage: [null as number | null],
    remarque: [''],
    modePaiement: ['ESPECE', Validators.required],
  });

  ngOnInit() {
    this.load();
    forkJoin({
      clients: this.clientService.getAll(),
      fiches: this.ficheService.getAll(),
    }).subscribe({
      next: ({ clients, fiches }) => {
        this.clients = (clients || []).filter(c => c.enabled);
        this.ordresReparation = fiches || [];
      },
      error: () => {},
    });

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openCreate();
      }
      if (params['statut']) {
        this.filterStatut = params['statut'];
      } else if (!params['action'] && !params['search']) {
        this.filterStatut = '';
      }
      if (params['search'] === 'client-date') {
        this.showDateFilter = true;
      }
      this.applyFilter(); this.cdr.markForCheck();
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => {
        this.notes = (data || []).sort((a: any, b: any) => (b.id ?? 0) - (a.id ?? 0));
        this.applyFilter(); this.cdr.markForCheck();
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => {
        this.notes = [];
        this.filtered = [];
        this.loading = false; this.cdr.markForCheck();
      },
    });
  }

  applyFilter() {
    let data = this.notes || [];
    if (this.filterStatut === 'EN_COURS') {
      data = data.filter(f => f.statutPaiement !== 'PAYE');
    } else if (this.filterStatut === 'PAYE') {
      data = data.filter(f => f.statutPaiement === 'PAYE');
    }
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      data = data.filter(f =>
        (f.numero ?? '').toLowerCase().includes(kw) ||
        (f.clientNom ?? '').toLowerCase().includes(kw) ||
        (f.vehiculeImmatriculation ?? f.immatriculation ?? '').toLowerCase().includes(kw)
      );
    }
    if (this.dateDebut) {
      data = data.filter(f => {
        const d = this.getDateString(f.dateCreation);
        return d ? d >= this.dateDebut : false;
      });
    }
    if (this.dateFin) {
      data = data.filter(f => {
        const d = this.getDateString(f.dateCreation);
        return d ? d <= this.dateFin : false;
      });
    }
    if (this.filterClient) {
      const cKw = this.filterClient.toLowerCase();
      data = data.filter(f =>
        (f.clientNom ?? '').toLowerCase().includes(cKw) ||
        String(f.clientId ?? '').includes(cKw)
      );
    }
    this.filtered = data;
    this.page = 1;
  }

  private getDateString(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') return d.slice(0, 10);
    if (Array.isArray(d)) {
      const [year, month, day] = d;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return '';
  }

  onStatutFilter(e: Event) {
    this.filterStatut = (e.target as HTMLSelectElement).value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter(); this.cdr.markForCheck();
  }

  // ── Wizard ─────────────────────────────────────────────────────

  openCreate() {
    if (!this.form.get('clientId')?.value) {
      this.form.reset({ remarque: '', modePaiement: 'ESPECE' });
      this.vehiculesFiltres = [];
      this.clientFilter = '';
      this.vehiculeFilter = '';
      this.createStep = 1;
    }
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  closeCreate() {
    this.showCreateModal = false;
    this.errorMessage = '';
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
      this.fichesFiltrees = this.ordresReparation.filter(f => f.vehicule?.id === Number(vehiculeCtrl.value));
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

  get filteredVehicules() {
    return this.vehiculesFiltres.filter(v =>
      (v.immatriculation?.toLowerCase() || '').includes(this.vehiculeFilter.toLowerCase()) ||
      (v.marque?.toLowerCase() || '').includes(this.vehiculeFilter.toLowerCase())
    );
  }

  get availableFiches() {
    return this.fichesFiltrees;
  }

  get filteredFiches() {
    const kw = this.ficheFilter.toLowerCase();
    return this.availableFiches.filter(f =>
      (f.numero?.toLowerCase() || '').includes(kw)
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
    this.form.patchValue({ vehiculeId: v.id, ordreReparationId: null });
    this.vehiculeFilter = '';
    this.vehiculeOpen = false;
    this.fichesFiltrees = this.ordresReparation.filter(f => f.vehicule?.id === v.id);
  }

  // ── Step 2 helpers ─────────────────────────────────────────────

  get ordreReparationLabel(): string {
    const id = this.form.get('ordreReparationId')?.value;
    if (!id) return '';
    const f = this.fichesFiltrees.find(x => x.id === Number(id));
    return f ? `Fiche #${f.numero}` : '';
  }

  selectFiche(f: OrdreReparation) {
    this.form.patchValue({ ordreReparationId: f.id });
    this.ficheOpen = false;
    this.ficheFilter = '';
  }

  // ── Save ────────────────────────────────────────────────────────

  save() {
    if (this.saving) return;
    const val = this.form.value as any;

    if (!val.modePaiement || !val.ordreReparationId) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const request: NoteDePrixCreateRequest = {
      clientId: Number(val.clientId),
      vehiculeId: Number(val.vehiculeId),
      ordreReparationId: Number(val.ordreReparationId),
      kilometrage: val.kilometrage || null,
      remarque: val.remarque || null,
      modePaiement: val.modePaiement,
    };

    this.service.create(request).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.closeCreate();
        this.form.reset({ remarque: '', modePaiement: 'ESPECE' });
        this.createStep = 1;
        this.load();
        this.notify('Note de prix ' + (res.numero || '') + ' créée avec succès !');
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors de la création de la note de prix.';
      },
    });
  }

  // ── Detail ──────────────────────────────────────────────────────

  openDetail(f: NoteDePrixModel) { this.selectedNote = f; }
  closeDetail() { this.selectedNote = null; }

  delete(id: number) {
    if (!confirm('Supprimer cette note de prix ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Note de prix supprimée.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  // ── Payment ─────────────────────────────────────────────────────

  openPayModal(f: NoteDePrixModel) {
    this.noteToPay = f;
    this.payMontant = f.resteAPayer;
    this.payMethode = 'ESPECE';
    this.showPayModal = true;
  }

  closePayModal() {
    this.showPayModal = false;
    this.noteToPay = null;
    this.paySaving = false;
  }

  submitPayment() {
    if (!this.noteToPay || this.paySaving) return;
    if (this.payMontant <= 0 || this.payMontant > this.noteToPay.resteAPayer) {
      this.notifyError('Montant invalide');
      return;
    }

    this.paySaving = true;
    const newPaye = (this.noteToPay.montantPaye || 0) + this.payMontant;

    this.service.update(this.noteToPay.id, {
      clientId: this.noteToPay.clientId,
      vehiculeId: this.noteToPay.vehiculeId,
      ordreReparationId: this.noteToPay.ordreReparationId,
      montantPaye: newPaye,
      modePaiement: this.payMethode,
    } as any).subscribe({
      next: () => {
        this.paySaving = false;
        this.closePayModal();
        this.load();
        this.notify('Paiement enregistré avec succès !');
      },
      error: (err: any) => {
        this.paySaving = false;
        this.notifyError(err?.error?.message || 'Erreur lors du paiement.');
      }
    });
  }

  modePaiementLabel(mp: string | null | undefined): string {
    const m: Record<string, string> = { CHEQUE: 'Chèque', ESPECE: 'Espèces', HORS_TAXE: 'Hors taxe' };
    return m[mp ?? ''] ?? mp ?? '—';
  }

  formatDate(d: any): string {
    if (!d) return '—';
    try {
      if (Array.isArray(d)) {
        const [year, month, day] = d;
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
      }
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? String(d) : parsed.toLocaleDateString('fr-FR');
    } catch {
      return String(d);
    }
  }

  fmt(n: number | null | undefined): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): NoteDePrixModel[] {
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
