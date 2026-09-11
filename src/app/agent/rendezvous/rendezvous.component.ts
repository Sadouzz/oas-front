import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RendezVousService } from './rendezvous.service';
import { ClientService } from '../clients/client.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { RendezVous, RendezVousStatus, ClientModel, VehiculeModel, CreateRendezVousRequest, extractContent, extractPage } from '../../shared/models/index';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import {
  LucideSearch, LucideX, LucideCalendar, LucideCheck, LucidePencil, LucideFileText, LucidePlus, LucideUser
} from '@lucide/angular';

@Component({
  selector: 'app-rendezvous',
  standalone: true,
  imports: [
    ReactiveFormsModule, AlertComponent, PaginationComponent,
    LucideSearch, LucideX, LucideCalendar, LucideCheck, LucidePencil, LucideFileText, LucidePlus, LucideUser
  ],
  templateUrl: './rendezvous.component.html',
})
export class RendezVousComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(RendezVousService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  rdvs: RendezVous[] = [];
  filtered: RendezVous[] = [];
  clients: ClientModel[] = [];
  vehicules: VehiculeModel[] = [];
  clientVehicules: VehiculeModel[] = [];

  editedDate = '';

  loading = true;
  saving = false;
  showStatutModal = false;
  showValiderModal = false;
  showCreateModal = false;
  editingRdv: RendezVous | null = null;

  clientOpen = false;
  clientFilter = '';

  searchText = '';
  filterStatut: RendezVousStatus | '' = '';
  private searchTimeout: any;

  page = 1;
  pageSize = 10;
  totalElements = 0;
  totalPages = 1;
  successMessage = '';
  errorMessage = '';
  modalErrorMessage = '';
  modalSuccessMessage = '';

  readonly statutOptions: { value: RendezVousStatus; label: string }[] = [
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'CONFIRME',   label: 'En cours (Confirmé)' },
    { value: 'TERMINE',    label: 'Fiche atelier créée' },
    { value: 'REFUSE',     label: 'Refusé' },
    { value: 'ANNULE',     label: 'Annulé' },
  ];

  readonly quickMotifs = [
    'Entretien périodique & Vidange',
    'Diagnostic panne / Voyant moteur',
    'Freinage & Sécurité',
    'Climatisation / Chauffage',
    'Courroie de distribution',
    'Révision générale',
    'Parallélisme / Pneumatiques',
  ];

  statutForm: FormGroup = this.fb.group({
    statut:      ['', Validators.required],
    commentaire: [''],
  });

  createForm: FormGroup = this.fb.group({
    clientId:       [null as number | null, Validators.required],
    vehiculeId:     [null as number | null],
    dateRendezVous: ['', Validators.required],
    motif:          ['', [Validators.required, Validators.minLength(3)]],
    statut:         ['EN_ATTENTE', Validators.required],
    commentaire:    [''],
  });

  ngOnInit() {
    this.load();
    this.loadClientsAndVehicles();

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openCreate();
      }
    });
  }

  loadClientsAndVehicles() {
    this.clientService.getAll().subscribe({
      next: (res) => {
        this.clients = extractContent<ClientModel>(res);
        this.cdr.markForCheck();
      },
      error: () => {}
    });

    this.vehiculeService.getAll().subscribe({
      next: (res) => {
        this.vehicules = extractContent<VehiculeModel>(res);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  load() {
    this.loading = true;
    this.cdr.markForCheck();
    this.service.getAll({
      page: this.page - 1,
      size: this.pageSize,
      keyword: this.searchText ? this.searchText.trim() : undefined,
      statut: this.filterStatut || undefined,
    }).subscribe({
      next: data => {
        this.rdvs = extractContent<RendezVous>(data);
        this.filtered = this.rdvs;
        const pageInfo = extractPage<RendezVous>(data);
        if (pageInfo) {
          this.totalElements = pageInfo.totalElements ?? this.rdvs.length;
          this.totalPages = pageInfo.totalPages ?? Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        } else {
          this.totalElements = this.rdvs.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.rdvs = [];
        this.filtered = [];
        this.totalElements = 0;
        this.totalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onSearch(e: Event) {
    this.searchText = (e.target as HTMLInputElement).value;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.load();
    }, 300);
  }

  onStatutFilter(e: Event) {
    this.filterStatut = (e.target as HTMLSelectElement).value as RendezVousStatus | '';
    this.page = 1;
    this.load();
  }

  // ─── Création de RDV ──────────────────────────────
  get clientLabel(): string {
    const id = this.createForm.get('clientId')?.value;
    if (!id) return '';
    const c = this.clients.find(x => x.id === Number(id));
    return c ? `${c.firstName} ${c.lastName}` : '';
  }

  get selectedClient(): ClientModel | undefined {
    const id = this.createForm.get('clientId')?.value;
    if (!id) return undefined;
    return this.clients.find(x => x.id === Number(id));
  }

  get filteredClients(): ClientModel[] {
    if (!this.clientFilter) return this.clients;
    const kw = this.clientFilter.toLowerCase();
    return this.clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(kw) ||
      (c.phone ?? '').toLowerCase().includes(kw) ||
      (c.email ?? '').toLowerCase().includes(kw)
    );
  }

  loadingClientVehicules = false;

  selectClient(c: ClientModel) {
    this.createForm.patchValue({ clientId: c.id, vehiculeId: null });
    this.clientFilter = '';
    this.clientOpen = false;
    this.loadingClientVehicules = true;
    this.clientVehicules = [];

    this.vehiculeService.getByClient(c.id).subscribe({
      next: (res) => {
        this.clientVehicules = extractContent<VehiculeModel>(res);
        this.loadingClientVehicules = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.clientVehicules = this.vehicules.filter(v => v.client?.id === c.id || (v as any).clientId === c.id);
        this.loadingClientVehicules = false;
        this.cdr.markForCheck();
      }
    });
    this.cdr.markForCheck();
  }

  clearClient() {
    this.createForm.patchValue({ clientId: null, vehiculeId: null });
    this.clientVehicules = [];
    this.loadingClientVehicules = false;
    this.clientFilter = '';
    this.cdr.markForCheck();
  }

  selectMotif(m: string) {
    this.createForm.patchValue({ motif: m });
  }

  get minDate(): string {
    return this.toDatetimeLocal(new Date().toISOString());
  }

  openCreate() {
    this.createForm.reset({
      clientId: null,
      vehiculeId: null,
      dateRendezVous: this.getDefaultDate(),
      motif: '',
      statut: 'EN_ATTENTE',
      commentaire: '',
    });
    this.clientFilter = '';
    this.clientOpen = false;
    this.clientVehicules = [];
    this.loadingClientVehicules = false;
    this.modalErrorMessage = '';
    this.showCreateModal = true;
  }

  closeCreate() {
    this.showCreateModal = false;
    this.modalErrorMessage = '';
    this.clientOpen = false;
  }

  private getDefaultDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return this.toDatetimeLocal(d.toISOString());
  }

  saveCreate() {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.modalErrorMessage = 'Veuillez remplir tous les champs obligatoires correctement.';
      return;
    }

    this.saving = true;
    this.modalErrorMessage = '';
    const raw = this.createForm.value;

    const payload: CreateRendezVousRequest = {
      clientId: Number(raw.clientId),
      vehiculeId: raw.vehiculeId ? Number(raw.vehiculeId) : null,
      dateRendezVous: new Date(raw.dateRendezVous).toISOString(),
      motif: raw.motif.trim(),
      statut: raw.statut || 'EN_ATTENTE',
      commentaire: raw.commentaire?.trim() || null,
    };

    this.service.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.closeCreate();
        this.load();
        this.notify('Rendez-vous créé avec succès.');
      },
      error: (err: any) => {
        this.saving = false;
        this.modalErrorMessage = err.error?.message || err.error || 'Erreur lors de la création du rendez-vous.';
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Statut & Validation Modals ──────────────────────────────
  openStatut(rdv: RendezVous) {
    this.editingRdv = rdv;
    this.modalErrorMessage = '';
    this.modalSuccessMessage = '';
    this.statutForm.patchValue({ statut: rdv.statut, commentaire: rdv.commentaire ?? '' });
    this.showStatutModal = true;
  }

  openValider(rdv: RendezVous) {
    this.editingRdv = rdv;
    this.editedDate = this.toDatetimeLocal(rdv.dateRendezVous);
    this.modalErrorMessage = '';
    this.modalSuccessMessage = '';
    this.showValiderModal = true;
  }

  onDateChange(e: Event) {
    this.editedDate = (e.target as HTMLInputElement).value;
  }

  closeModals() {
    this.showStatutModal = false;
    this.showValiderModal = false;
    this.showCreateModal = false;
    this.editingRdv = null;
    this.modalErrorMessage = '';
    this.modalSuccessMessage = '';
  }

  saveStatut() {
    if (!this.editingRdv || this.statutForm.invalid) return;
    this.saving = true;
    this.modalErrorMessage = '';
    const { statut, commentaire } = this.statutForm.value;
    this.service.updateStatut(this.editingRdv.id, statut, commentaire || undefined).subscribe({
      next: () => {
        this.closeModals();
        this.load();
        this.notify('Statut mis à jour.');
      },
      error: (err: any) => {
        this.saving = false;
        this.modalErrorMessage = err.error?.message || 'Erreur lors de la mise à jour.';
      },
    });
  }

  saveValider() {
    if (!this.editingRdv) return;
    this.saving = true;
    this.modalErrorMessage = '';

    const doValider = () => {
      this.service.valider(this.editingRdv!.id).subscribe({
        next: () => {
          this.closeModals();
          this.load();
          this.notify('Rendez-vous confirmé.');
        },
        error: (err: any) => {
          this.saving = false;
          this.modalErrorMessage = err.error?.message || 'Erreur lors de la confirmation.';
        },
      });
    };

    if (this.editedDate) {
      const isoDate = new Date(this.editedDate).toISOString();
      this.service.updateDate(this.editingRdv.id, isoDate).subscribe({
        next: () => doValider(),
        error: (err: any) => {
          this.saving = false;
          this.modalErrorMessage = err.error?.message || 'Erreur lors de la mise à jour de la date.';
        },
      });
    } else {
      doValider();
    }
  }

  createFicheAtelier(rdv: RendezVous) {
    this.router.navigate(['/app/admin/fiches-atelier/new', rdv.id]);
  }

  get paged(): RendezVous[] {
    return Array.isArray(this.filtered) ? this.filtered : [];
  }

  onPageChange(p: number) {
    this.page = p;
    this.load();
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.load();
    }
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  statutLabel(s: RendezVousStatus): string {
    return this.statutOptions.find(o => o.value === s)?.label ?? s;
  }

  statutClass(s: RendezVousStatus): string {
    const map: Record<RendezVousStatus, string> = {
      EN_ATTENTE: 'bg-red-100 text-red-700',
      CONFIRME:   'bg-orange-100 text-orange-700',
      TERMINE:    'bg-green-100 text-green-700',
      REFUSE:     'bg-gray-200 text-gray-800',
      ANNULE:     'bg-gray-100 text-gray-500',
    };
    return map[s] ?? '';
  }

  private notify(msg: string) {
    this.saving = false;
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }

  private notifyError(msg: string) {
    this.saving = false;
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }

  private toDatetimeLocal(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
