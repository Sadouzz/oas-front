import { ConfirmationService } from '../../shared/components/confirmation/confirmation.service';
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, finalize, of, Subscription } from 'rxjs';
import { CommonModule, NgClass } from '@angular/common';
import { NoteDePrixService } from './note-de-prix.service';
import { NoteDePrixModel, NoteDePrixCreateRequest } from './models/note-de-prix.model';
import { ClientService } from '../clients/client.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { OrdreReparationService } from '../ordres-reparation/ordre-reparation.service';
import { LucideSearch, LucidePlus, LucideX, LucideDownload, LucideReceipt, LucideEye } from '@lucide/angular';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { UserModel, VehiculeModel, OrdreReparation, extractContent } from '../../shared/models';
import { FiscalConfigurationService } from '../gestion-tva/fiscal-configuration.service';
import { PdfLayoutDialogService } from '../../shared/components/pdf-layout-dialog/pdf-layout-dialog.service';
import {
  EnrichableLignePiece,
  PieceLigneType,
  pieceTypeBadgeClass,
  resolvePieceDesignation,
  resolvePieceType,
} from '../../shared/utils/piece-ligne.util';

@Component({
  selector: 'app-notes-prix',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgClass, PaginationComponent, LucideSearch, LucidePlus, LucideX, LucideDownload, LucideReceipt, LucideEye],
  templateUrl: './notes-prix.component.html',
})
export class NotesPrixComponent extends BasePaginatedComponent implements OnInit, OnDestroy {
  private confirmation = inject(ConfirmationService);

  private cdr = inject(ChangeDetectorRef);
  private service = inject(NoteDePrixService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private ordreReparationService = inject(OrdreReparationService);
  private fiscalConfigurationService = inject(FiscalConfigurationService);
  private pdfLayoutDialog = inject(PdfLayoutDialogService);
  timbreFiscalRate = 1;

  notes: NoteDePrixModel[] = [];
  filtered: NoteDePrixModel[] = [];
  loading = true;
  saving = false;
  selectedNote: NoteDePrixModel | null = null;
  selectedNoteLoading = false;
  showCreateModal = false;
  createStep = 1;

  showPayModal = false;
  noteToPay: NoteDePrixModel | null = null;
  payMontant = 0;
  payMethode = 'ESPECE';
  paySaving = false;

  get payTimbreEspeces(): number {
    return this.payMethode === 'ESPECE' ? Math.round((Number(this.payMontant) || 0) * this.timbreFiscalRate) / 100 : 0;
  }

  get payTotalEncaisse(): number { return (Number(this.payMontant) || 0) + this.payTimbreEspeces; }

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

  searchNumero = '';
  searchImmatriculation = '';
  searchClientNumero = '';
  clientMatriculeById: Record<number, string> = {};
  private searchDebounce: any = null;
  private loadSub?: Subscription;
  private destroyed = false;

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
    modePaiement: ['ESPECE_TTC', Validators.required],
    appliquerTVA: [false],
  });

  ngOnInit() {
    this.fiscalConfigurationService.getCurrent().subscribe({
      next: config => { this.timbreFiscalRate = Number(config.timbreFiscalRate) || 0; this.cdr.markForCheck(); },
      error: () => undefined,
    });
    this.clientService.getAll({ size: 500 }).pipe(catchError(() => of([]))).subscribe({
      next: res => {
        const map: Record<number, string> = {};
        for (const client of extractContent<any>(res as any)) {
          if (client?.id != null && client?.matricule) {
            map[Number(client.id)] = String(client.matricule);
          }
        }
        this.clientMatriculeById = map;
        if (this.searchClientNumero.trim()) {
          this.applyFilter();
        }
        this.cdr.markForCheck();
      },
    });
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openCreate();
      }
      if (params['statut']) {
        this.filterStatut = params['statut'];
      } else {
        this.filterStatut = '';
      }
      if (params['search'] === 'client-date' || params['search'] === 'filtre') {
        this.showDateFilter = true;
      }
      if (params['detailId']) {
        const detailId = Number(params['detailId']);
        if (Number.isFinite(detailId) && detailId > 0) {
          this.openDetailById(detailId);
        }
      }
      this.page = 1;
      this.loadData();
    });
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.loadSub?.unsubscribe();
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  get hasActiveFilters(): boolean {
    return Boolean(
      this.searchTerm ||
      this.searchNumero.trim() ||
      this.searchImmatriculation.trim() ||
      this.searchClientNumero.trim() ||
      this.filterClient.trim() ||
      this.filterStatut ||
      this.dateDebut ||
      this.dateFin
    );
  }

  override get totalPages(): number {
    return this.hasActiveFilters
      ? (Math.ceil(this.filtered.length / this.pageSize) || 1)
      : super.totalPages;
  }

  get displayTotalElements(): number {
    return this.hasActiveFilters ? this.filtered.length : this.totalElements;
  }

  loadData() {
    this.load();
  }

  load() {
    this.loadSub?.unsubscribe();
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();
    const numero = this.searchNumero.trim();
    const immatriculation = this.searchImmatriculation.trim();
    const clientNumero = this.searchClientNumero.trim();
    const clientExtra = this.filterClient.trim();
    const effectiveKeyword = this.searchTerm || numero || immatriculation || undefined;
    const isFiltering = this.hasActiveFilters;

    const params: Record<string, any> = {
      ...this.getPageParams({
        page: isFiltering ? 0 : this.page - 1,
        size: isFiltering ? 1000 : this.pageSize,
      }),
      ...(effectiveKeyword ? { keyword: effectiveKeyword } : {}),
      ...(numero ? { numero } : {}),
      ...(immatriculation ? { immatriculation } : {}),
      ...(clientNumero ? { clientNumero, client: clientNumero } : {}),
      ...(/^\d+$/.test(clientNumero) ? { clientId: Number(clientNumero) } : {}),
      ...(clientExtra && !clientNumero ? { client: clientExtra } : {}),
      ...(this.filterStatut ? { statut: this.filterStatut } : {}),
      ...(this.dateDebut ? { dateDebut: this.dateDebut } : {}),
      ...(this.dateFin ? { dateFin: this.dateFin } : {}),
    };

    this.loadSub = this.service.getAll(params).pipe(
      finalize(() => {
        this.loading = false;
        if (!this.destroyed) this.cdr.detectChanges();
      })
    ).subscribe({
      next: data => {
        try {
          const arr = this.applyPageResponse<NoteDePrixModel>(data);
          this.notes = (Array.isArray(arr) ? [...arr] : []).sort((a: any, b: any) => (b?.id ?? 0) - (a?.id ?? 0));
          this.applyFilter();
        } catch {
          this.notes = [];
          this.filtered = [];
        } finally {
          this.loading = false;
          if (!this.destroyed) this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        this.notes = [];
        this.filtered = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.errorMessage = err?.error?.message || 'Impossible de charger les notes de prix.';
        this.loading = false;
        if (!this.destroyed) this.cdr.detectChanges();
      },
    });
  }

  triggerSearch(immediate = false) {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
    this.page = 1;
    if (immediate) {
      this.loadData();
      return;
    }
    this.searchDebounce = setTimeout(() => {
      this.searchDebounce = null;
      this.loadData();
    }, 300);
  }

  resetFilters() {
    this.searchNumero = '';
    this.searchImmatriculation = '';
    this.searchClientNumero = '';
    this.searchTerm = '';
    this.filterStatut = '';
    this.dateDebut = '';
    this.dateFin = '';
    this.filterClient = '';
    this.page = 1;
    this.loadData();
  }

  clientNumeroLabel(f: NoteDePrixModel): string {
    const anyNote = f as any;
    const matricule = f.clientNumero ?? f.numeroClient ?? f.clientMatricule ?? anyNote?.client?.matricule ?? (f.clientId != null ? this.clientMatriculeById[f.clientId] : undefined);
    if (matricule != null && String(matricule).trim()) return String(matricule).trim();
    const cid = f.clientId ?? anyNote?.client?.id;
    if (cid != null) return String(cid);
    return '—';
  }

  immatriculationLabel(f: NoteDePrixModel): string {
    const anyNote = f as any;
    return String(f.vehiculeImmatriculation ?? f.immatriculation ?? anyNote?.vehicule?.immatriculation ?? '').trim() || '—';
  }

  applyFilter() {
    let data = this.notes || [];
    if (this.filterStatut === 'EN_COURS') {
      data = data.filter(f => f.statutPaiement !== 'PAYE');
    } else if (this.filterStatut === 'PAYE') {
      data = data.filter(f => f.statutPaiement === 'PAYE');
    }
    if (this.searchNumero.trim()) {
      const q = this.searchNumero.trim().toLowerCase();
      data = data.filter(f => String(f.numero ?? '').toLowerCase().includes(q));
    }
    if (this.searchImmatriculation.trim()) {
      const q = this.searchImmatriculation.trim().toLowerCase();
      data = data.filter(f => {
        const anyNote = f as any;
        const immat = String(f.vehiculeImmatriculation ?? f.immatriculation ?? anyNote?.vehicule?.immatriculation ?? '').toLowerCase();
        return immat.includes(q);
      });
    }
    if (this.searchClientNumero.trim()) {
      const q = this.searchClientNumero.trim().toLowerCase();
      data = data.filter(f => {
        const anyNote = f as any;
        const cid = f.clientId ?? anyNote?.client?.id;
        return (
          String(f.clientNumero ?? '').toLowerCase().includes(q) ||
          String(f.numeroClient ?? '').toLowerCase().includes(q) ||
          String(f.clientMatricule ?? anyNote?.client?.matricule ?? '').toLowerCase().includes(q) ||
          (cid != null ? String(this.clientMatriculeById[cid] ?? '').toLowerCase().includes(q) : false) ||
          String(cid ?? '').toLowerCase().includes(q) ||
          String(f.clientNom ?? '').toLowerCase().includes(q)
        );
      });
    }
    if (this.searchTerm) {
      const kw = String(this.searchTerm).toLowerCase();
      data = data.filter(f => {
        const anyNote = f as any;
        const immat = String(f.vehiculeImmatriculation ?? f.immatriculation ?? anyNote?.vehicule?.immatriculation ?? '').toLowerCase();
        return (
          String(f.numero ?? '').toLowerCase().includes(kw) ||
          String(f.clientNom ?? '').toLowerCase().includes(kw) ||
          immat.includes(kw) ||
          this.clientNumeroLabel(f).toLowerCase().includes(kw) ||
          String(f.clientId ?? '').includes(kw)
        );
      });
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
        String(f.clientNom ?? '').toLowerCase().includes(cKw) ||
        this.clientNumeroLabel(f).toLowerCase().includes(cKw) ||
        String(f.clientId ?? '').includes(cKw)
      );
    }
    this.filtered = data;
    const maxPages = Math.ceil(this.filtered.length / this.pageSize) || 1;
    if (this.hasActiveFilters && this.page > maxPages) {
      this.page = 1;
    }
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
    this.page = 1;
    this.loadData();
  }

  // onSearch is inherited from BasePaginatedComponent

  // ── Wizard ─────────────────────────────────────────────────────

  openCreate() {
    if (!this.form.get('clientId')?.value) {
      this.form.reset({ remarque: '', modePaiement: 'ESPECE_TTC', appliquerTVA: false });
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
      appliquerTVA: val.appliquerTVA === true,
    };

    this.service.create(request).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.closeCreate();
        this.form.reset({ remarque: '', modePaiement: 'ESPECE_TTC', appliquerTVA: false });
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

  openDetail(f: NoteDePrixModel) {
    this.selectedNote = f;
    this.fetchDetail(f.id, false);
  }

  openDetailById(id: number) {
    this.selectedNote = {
      id,
      numero: 'Chargement…',
      dateCreation: '',
      montantHT: 0,
      montantTotal: 0,
      montantPaye: 0,
      resteAPayer: 0,
      lignesPieces: [],
      lignesMainDoeuvres: [],
    };
    this.fetchDetail(id, true);
  }

  private fetchDetail(id: number, clearOnError: boolean) {
    this.selectedNoteLoading = true;
    this.cdr.markForCheck();
    this.service.getById(id).subscribe({
      next: detail => {
        if (this.selectedNote?.id !== id) return;
        this.selectedNote = {
          ...detail,
          lignesPieces: detail.lignesPieces ?? [],
          lignesMainDoeuvres: detail.lignesMainDoeuvres ?? [],
        };
        this.selectedNoteLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        if (this.selectedNote?.id !== id) return;
        if (clearOnError) {
          this.selectedNote = null;
          this.errorMessage = err?.error?.message || 'Impossible de charger le détail de cette note de prix.';
        }
        this.selectedNoteLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  pieceDesignation(l: EnrichableLignePiece): string {
    return resolvePieceDesignation(l);
  }

  pieceType(l: EnrichableLignePiece): PieceLigneType {
    return resolvePieceType(l);
  }

  pieceTypeClass(l: EnrichableLignePiece): string {
    return pieceTypeBadgeClass(this.pieceType(l));
  }

  closeDetail() {
    this.selectedNote = null;
    this.selectedNoteLoading = false;
  }

  async delete(id: number) {
    if (!await this.confirmation.confirm('Supprimer cette note de prix ?')) return;
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

  async downloadPdf(id: number) {
    const layoutKey = await this.pdfLayoutDialog.chooseLayout();
    if (!layoutKey) return;
    this.service.downloadPdf(id, layoutKey).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `note-de-prix-${id}-${layoutKey === 'AVEC_ENTETE' ? 'avec-entete' : 'sans-entete'}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        this.notifyError(err?.error?.message || 'Erreur lors du téléchargement du PDF.');
      },
    });
  }

  modePaiementLabel(mp: string | null | undefined): string {
    const m: Record<string, string> = {
      CHEQUE: 'Chèque',
      ESPECE: 'Espèce',
      ESPECE_TTC: 'Espèce',
      CHEQUE_TTC: 'Chèque',
      ESPECE_HT: 'Espèce HT',
      CHEQUE_HT: 'Chèque HT',
      HORS_TAXE: 'Hors taxe'
    };
    return m[mp ?? ''] ?? mp ?? '—';
  }

  formatDate(d: any): string {
    if (!d) return '—';
    try {
      if (Array.isArray(d)) {
        const [year, month, day, hour, minute, second] = d;
        const datePart = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        if (hour !== undefined && minute !== undefined) {
          const secPart = second !== undefined ? `:${String(second).padStart(2, '0')}` : '';
          return `${datePart} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}${secPart}`;
        }
        return datePart;
      }
      const raw = String(d);
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return raw;
      if (raw.includes('T') || /\d{2}:\d{2}/.test(raw)) {
        return parsed.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      }
      return parsed.toLocaleDateString('fr-FR');
    } catch {
      return String(d);
    }
  }

  fmt(n: number | null | undefined): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): NoteDePrixModel[] {
    if (!this.hasActiveFilters) return this.filtered;
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  private notify(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
