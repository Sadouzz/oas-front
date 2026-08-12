import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CommonModule, DecimalPipe, DatePipe, NgClass } from '@angular/common';
import { FactureService } from '../../services/facture.service';
import { FactureModel, FactureCreateRequest } from '../../shared/models/facture.model';
import { ClientService, UserModel } from '../../services/client.service';
import { VehiculeService, VehiculeModel } from '../../services/vehicule.service';
import { OrdreReparationService, OrdreReparation } from '../../services/ordre-reparation.service';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideReceipt, LucideEye, LucidePrinter } from '@lucide/angular';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, NgClass, PaginationComponent, LucideSearch, LucidePlus, LucideTrash2, LucideX, LucideDownload, LucideReceipt],
  templateUrl: './factures.component.html',
})
export class FacturesComponent implements OnInit {
  private service = inject(FactureService);
  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private ficheService = inject(OrdreReparationService);

  factures: FactureModel[] = [];
  filtered: FactureModel[] = [];
  loading = true;
  saving = false;
  selectedFacture: FactureModel | null = null;
  showCreateModal = false;
  createStep = 1;

  showPayModal = false;
  factureToPay: FactureModel | null = null;
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
  successMessage = '';
  errorMessage = '';

  form = this.fb.group({
    clientId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null, Validators.required],
    ordreReparationId: [null as number | null, Validators.required],
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
        this.clients = clients.filter(c => c.enabled);
        this.ordresReparation = fiches;
      },
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

    const request: FactureCreateRequest = {
      clientId: Number(val.clientId),
      vehiculeId: Number(val.vehiculeId),
      ordreReparationId: Number(val.ordreReparationId),
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
        this.notify('Facture ' + res.numero + ' créée avec succès !');
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

  // ── Payment ─────────────────────────────────────────────────────

  openPayModal(f: FactureModel) {
    this.factureToPay = f;
    this.payMontant = f.resteAPayer;
    this.payMethode = 'ESPECE';
    this.showPayModal = true;
  }

  closePayModal() {
    this.showPayModal = false;
    this.factureToPay = null;
    this.paySaving = false;
  }

  submitPayment() {
    if (!this.factureToPay || this.paySaving) return;
    if (this.payMontant <= 0 || this.payMontant > this.factureToPay.resteAPayer) {
      this.notifyError('Montant invalide');
      return;
    }

    this.paySaving = true;
    this.service.payFacture(this.factureToPay.id, this.payMontant, this.payMethode).subscribe({
      next: () => {
        this.paySaving = false;
        this.closePayModal();
        this.load();
        this.notify('Paiement enregistré avec succès !');
        // Si c'était un détail ouvert, on recharge le détail
        if (this.selectedFacture?.id === this.factureToPay?.id) {
          this.service.getAll().subscribe(res => {
            const updated = res.find(f => f.id === this.selectedFacture!.id);
            if (updated) this.selectedFacture = updated;
          });
        }
      },
      error: (err: any) => {
        this.paySaving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.notifyError(msg || 'Erreur lors du paiement.');
      }
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
