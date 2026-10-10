import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RendezVousService } from './rendezvous.service';
import { ClientService } from '../clients/client.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { RendezVous, RendezVousStatus, ClientModel, VehiculeModel, CreateRendezVousRequest, extractContent, extractPage } from '../../shared/models/index';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { DatePipe } from '@angular/common';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { PhoneInputComponent } from '../../shared/components/phone-input/phone-input.component';
import {
  LucideSearch, LucideX, LucideCalendar, LucideCheck, LucideFileText, LucidePlus, LucideUser, LucideLock
} from '@lucide/angular';

@Component({
  selector: 'app-rendezvous',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule, AlertComponent, PaginationComponent, SearchableSelectComponent, PhoneInputComponent,
    LucideSearch, LucideX, LucideCalendar, LucideCheck, LucideFileText, LucidePlus, LucideUser, LucideLock
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

  formatVehicule = (v: VehiculeModel): string => {
    if (!v) return '';
    const immat = v.immatriculation || '';
    const details = `${v.marque || ''} ${v.modele || ''}`.trim();
    return details ? `${immat} — ${details}` : immat;
  };

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
  clientPhone = '';
  whatsappFallbackUrl = '';
  whatsappNotice = '';
  showQuickClientForm = false;
  showQuickVehicleForm = false;
  quickClientError = '';
  quickVehicleError = '';
  quickClientForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required], lastName: ['', Validators.required],
    phone: ['', Validators.required], email: ['', [Validators.required, Validators.email]], adresse: [''],
  });
  quickVehicleForm: FormGroup = this.fb.group({
    immatriculation: ['', Validators.required], marque: ['', Validators.required], modele: ['', Validators.required],
    annee: [null], kilometrage: [null], numeroChassis: [''],
  });

  readonly statutOptions: { value: RendezVousStatus; label: string }[] = [
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'CONFIRME',   label: 'En cours (Confirmé)' },
    { value: 'TERMINE',    label: 'Fiche atelier créée' },
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
    motifAnnulation: [''],
  });

  createForm: FormGroup = this.fb.group({
    clientId:       [null as number | null, Validators.required],
    vehiculeId:     [null as number | null],
    dateRendezVous: ['', Validators.required],
    motif:          ['', [Validators.required, Validators.minLength(3)]],
    statut:         ['EN_ATTENTE', Validators.required],
    commentaire:    [''],
  });

  loadingClients = false;
  selectedClientObj: ClientModel | null = null;
  private clientSearchDebounce: any;

  ngOnInit() {
    this.load();
    this.loadClientsAndVehicles();

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openCreate();
      }
    });
  }

  loadClients(keyword: string = '') {
    this.loadingClients = true;
    const params: any = { page: 0, size: 10 };
    if (keyword && keyword.trim()) {
      params.keyword = keyword.trim();
    }
    this.clientService.getAll(params).subscribe({
      next: (res) => {
        this.clients = extractContent<ClientModel>(res);
        this.loadingClients = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingClients = false;
        this.cdr.markForCheck();
      }
    });
  }

  onClientSearch(keyword: string) {
    this.clientFilter = keyword;
    this.clientOpen = true;
    clearTimeout(this.clientSearchDebounce);
    this.clientSearchDebounce = setTimeout(() => {
      this.loadClients(keyword);
    }, 300);
  }

  loadClientsAndVehicles() {
    this.loadClients('');

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
    if (this.selectedClientObj) {
      return `${this.selectedClientObj.firstName} ${this.selectedClientObj.lastName}`;
    }
    const id = this.createForm.get('clientId')?.value;
    if (!id) return '';
    const c = this.clients.find(x => x.id === Number(id));
    return c ? `${c.firstName} ${c.lastName}` : '';
  }

  get selectedClient(): ClientModel | undefined {
    if (this.selectedClientObj) return this.selectedClientObj;
    const id = this.createForm.get('clientId')?.value;
    if (!id) return undefined;
    return this.clients.find(x => x.id === Number(id));
  }

  get filteredClients(): ClientModel[] {
    return this.clients;
  }

  loadingClientVehicules = false;

  selectClient(c: ClientModel) {
    this.selectedClientObj = c;
    this.clientPhone = c.phone || '';
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
    this.selectedClientObj = null;
    this.createForm.patchValue({ clientId: null, vehiculeId: null });
    this.clientVehicules = [];
    this.loadingClientVehicules = false;
    this.clientFilter = '';
    this.clientOpen = true;
    this.loadClients('');
    this.cdr.markForCheck();
  }

  selectMotif(m: string) {
    this.createForm.patchValue({ motif: m });
  }

  openQuickClientForm(): void {
    this.quickClientError = '';
    this.quickClientForm.reset();
    this.showQuickClientForm = true;
  }

  createQuickClient(): void {
    if (this.quickClientForm.invalid) {
      this.quickClientForm.markAllAsTouched();
      return;
    }
    this.quickClientError = '';
    const raw = this.quickClientForm.getRawValue();
    this.clientService.create({ ...raw, password: '', typeClient: 'PARTICULIER' }).subscribe({
      next: (created: any) => {
        const client = created as ClientModel;
        this.clients = [client, ...this.clients.filter(c => c.id !== client.id)];
        this.showQuickClientForm = false;
        this.selectClient(client);
      },
      error: (err: any) => this.quickClientError = err.error?.message || "Impossible de créer le client.",
    });
  }

  createQuickVehicle(): void {
    if (this.quickVehicleForm.invalid || !this.selectedClient) {
      this.quickVehicleForm.markAllAsTouched();
      return;
    }
    this.quickVehicleError = '';
    const raw = this.quickVehicleForm.getRawValue();
    this.vehiculeService.create({
      immatriculation: String(raw.immatriculation).trim().toUpperCase(),
      marque: String(raw.marque).trim(), modele: String(raw.modele).trim(),
      annee: raw.annee ? Number(raw.annee) : null,
      kilometrage: raw.kilometrage !== null && raw.kilometrage !== '' ? Number(raw.kilometrage) : null,
      numeroChassis: raw.numeroChassis?.trim() || null,
      clientId: this.selectedClient.id,
    }).subscribe({
      next: created => {
        this.clientVehicules = [created, ...this.clientVehicules.filter(v => v.id !== created.id)];
        this.createForm.patchValue({ vehiculeId: created.id });
        this.showQuickVehicleForm = false;
      },
      error: (err: any) => this.quickVehicleError = err.error?.message || "Impossible de créer le véhicule.",
    });
  }

  get minDate(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    this.selectedClientObj = null;
    this.clientFilter = '';
    this.clientOpen = false;
    this.clientVehicules = [];
    this.showQuickClientForm = false;
    this.showQuickVehicleForm = false;
    this.quickClientError = '';
    this.quickVehicleError = '';
    this.loadingClientVehicules = false;
    this.modalErrorMessage = '';
    this.showCreateModal = true;
    this.loadClients('');
  }

  closeCreate() {
    this.showCreateModal = false;
    this.modalErrorMessage = '';
    this.clientOpen = false;
    this.showQuickClientForm = false;
    this.showQuickVehicleForm = false;
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

    if (this.createForm.value.dateRendezVous && this.createForm.value.dateRendezVous < this.minDate) {
      this.modalErrorMessage = 'La date du rendez-vous ne peut pas être dans le passé.';
      return;
    }

    this.saving = true;
    this.modalErrorMessage = '';
    const whatsappWindow = this.reserveWhatsAppWindow();
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
      next: (created) => {
        this.saving = false;
        this.closeCreate();
        this.load();
        this.openWhatsApp(whatsappWindow, created);
        this.notify('Rendez-vous créé avec succès.');
      },
      error: (err: any) => {
        whatsappWindow?.close();
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
    this.statutForm.patchValue({ statut: rdv.statut === 'REFUSE' ? 'ANNULE' : rdv.statut, commentaire: rdv.commentaire ?? '', motifAnnulation: rdv.motifAnnulation ?? '' });
    this.showStatutModal = true;
    this.loadClientPhone(rdv.clientId);
  }

  isValiderAction = true;

  openValider(rdv: RendezVous) {
    this.isValiderAction = true;
    this.editingRdv = rdv;
    this.editedDate = this.toDatetimeLocal(rdv.dateRendezVous);
    this.modalErrorMessage = '';
    this.modalSuccessMessage = '';
    this.showValiderModal = true;
    this.loadClientPhone(rdv.clientId);
  }

  openEditDate(rdv: RendezVous) {
    this.isValiderAction = false;
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
    const { statut, commentaire, motifAnnulation } = this.statutForm.value;
    if (statut === 'ANNULE' && !String(motifAnnulation ?? '').trim()) {
      this.saving = false;
      this.modalErrorMessage = "Le motif est obligatoire pour annuler le rendez-vous.";
      return;
    }
    const whatsappWindow = this.reserveWhatsAppWindow();
    this.service.updateStatut(this.editingRdv.id, statut, commentaire || undefined,
      statut === 'ANNULE' ? String(motifAnnulation).trim() : undefined).subscribe({
      next: (updated) => {
        this.closeModals();
        this.load();
        this.openWhatsApp(whatsappWindow, updated, String(motifAnnulation || ''));
        this.notify('Statut mis à jour.');
      },
      error: (err: any) => {
        whatsappWindow?.close();
        this.saving = false;
        this.modalErrorMessage = err.error?.message || 'Erreur lors de la mise à jour.';
      },
    });
  }

  saveValider() {
    if (!this.editingRdv) return;
    if (this.editedDate && this.editedDate < this.minDate) {
      this.modalErrorMessage = 'La date du rendez-vous ne peut pas être dans le passé.';
      return;
    }
    this.saving = true;
    this.modalErrorMessage = '';
    const shouldNotifyWhatsApp = this.isValiderAction && this.editingRdv.statut === 'EN_ATTENTE';
    const whatsappWindow = shouldNotifyWhatsApp ? this.reserveWhatsAppWindow() : null;

    const doValider = () => {
      this.service.valider(this.editingRdv!.id).subscribe({
        next: (updated) => {
          this.closeModals();
          this.load();
          this.openWhatsApp(whatsappWindow, updated);
          this.notify('Rendez-vous confirmé.');
        },
        error: (err: any) => {
          whatsappWindow?.close();
          this.saving = false;
          this.modalErrorMessage = err.error?.message || 'Erreur lors de la confirmation.';
        },
      });
    };

    const dateChanged = !!this.editedDate && !!this.editingRdv &&
      new Date(this.editedDate).getTime() !== new Date(this.editingRdv.dateRendezVous).getTime();

    if (dateChanged) {
      const isoDate = new Date(this.editedDate).toISOString();
      this.service.updateDate(this.editingRdv.id, isoDate).subscribe({
        next: (updated) => {
          if (this.isValiderAction && this.editingRdv?.statut === 'EN_ATTENTE') {
            doValider();
          } else {
            this.closeModals();
            this.load();
            this.openWhatsApp(whatsappWindow, updated, '', true);
            this.notify('Date du rendez-vous modifiée avec succès.');
          }
        },
        error: (err: any) => {
          whatsappWindow?.close();
          this.saving = false;
          this.modalErrorMessage = err.error?.message || 'Erreur lors de la mise à jour de la date.';
        },
      });
    } else {
      if (this.isValiderAction && this.editingRdv?.statut === 'EN_ATTENTE') {
        doValider();
      } else {
        this.closeModals();
        this.notify('Aucune modification de date à enregistrer.');
      }
    }
  }

  isRdvTodayOrPast(dateStr: string): boolean {
    if (!dateStr) return false;
    const rdv = new Date(dateStr);
    const now = new Date();
    const rdvMidnight = new Date(rdv.getFullYear(), rdv.getMonth(), rdv.getDate()).getTime();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return todayMidnight >= rdvMidnight;
  }

  canCreateFiche(rdv: RendezVous): boolean {
    if (rdv.vehiculeActif === false) return false;
    if (rdv.hasFicheAtelier || rdv.statut === 'TERMINE') return false;
    if (rdv.statut !== 'CONFIRME') return false;
    return this.isRdvTodayOrPast(rdv.dateRendezVous);
  }

  activerVehicule(rdv: RendezVous): void {
    if (!rdv.vehiculeId || rdv.vehiculeActif) return;
    this.vehiculeService.activer(rdv.vehiculeId).subscribe({
      next: () => {
        this.successMessage = `Le véhicule ${rdv.vehiculeImmatriculation || ''} est maintenant actif.`;
        this.load();
      },
      error: (err: any) => {
        this.errorMessage = err.error?.message || "Impossible d'activer ce véhicule.";
        this.cdr.markForCheck();
      }
    });
  }

  notifyNotToday(rdv: RendezVous) {
    const formatted = new Date(rdv.dateRendezVous).toLocaleDateString('fr-FR');
    this.notifyError(`Impossible de générer la fiche atelier avant le jour du rendez-vous (${formatted}).`);
  }

  formatRdvDateShort(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  createFicheAtelier(rdv: RendezVous) {
    if (!this.canCreateFiche(rdv)) {
      if (!this.isRdvTodayOrPast(rdv.dateRendezVous)) {
        this.notifyNotToday(rdv);
      } else {
        this.notifyError("Ce rendez-vous n'est pas éligible pour créer une fiche atelier.");
      }
      return;
    }
    this.router.navigate(['/app/admin/fiches-atelier/new', rdv.id]);
  }

  cancelRdv(rdv: RendezVous) {
    this.editingRdv = rdv;
    this.statutForm.reset({ statut: 'ANNULE', commentaire: '', motifAnnulation: '' });
    this.modalErrorMessage = '';
    this.showStatutModal = true;
    this.loadClientPhone(rdv.clientId);
  }

  private loadClientPhone(clientId: number | null | undefined): void {
    this.clientPhone = '';
    if (!clientId) return;
    this.clientService.getById(clientId).subscribe({
      next: client => this.clientPhone = client.phone || '',
      error: () => this.clientPhone = '',
    });
  }

  private reserveWhatsAppWindow(): Window | null {
    if (!this.clientPhone) return null;
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    return popup;
  }

  private openWhatsApp(popup: Window | null, rdv: RendezVous, reason = '', dateModified = false): void {
    if (!this.clientPhone) {
      this.whatsappNotice = 'Le changement est enregistré, mais aucun numéro de téléphone client ne permet de préparer le message WhatsApp.';
      this.whatsappFallbackUrl = '';
      return;
    }
    const date = new Date(rdv.dateRendezVous).toLocaleString('fr-FR');
    const isCancellation = rdv.statut === 'ANNULE' || rdv.statut === 'REFUSE';
    const message = isCancellation
      ? `Votre rendez-vous prévu à la date du ${date} a été annulé pour motif de ${reason || rdv.motifAnnulation || 'motif communiqué par notre équipe'}.`
      : dateModified
        ? `La date de votre rendez-vous a été modifiée au ${date}.`
        : rdv.statut === 'EN_ATTENTE'
          ? `Votre demande de rendez-vous prévue à la date du ${date} est enregistrée et en attente de confirmation.`
          : `Votre rendez-vous prévu à la date du ${date} a été confirmé.`;
    let phone = this.clientPhone.replace(/[^0-9]/g, '');
    if (phone.length === 9) phone = `221${phone}`;
    this.whatsappFallbackUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    this.whatsappNotice = 'Message WhatsApp préparé. Vérifiez-le puis appuyez sur Envoyer dans WhatsApp.';
    if (popup) popup.location.href = this.whatsappFallbackUrl;
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
    if (s === 'REFUSE') return 'Annulé';
    return this.statutOptions.find(o => o.value === s)?.label ?? s;
  }

  statutClass(s: RendezVousStatus): string {
    const map: Record<RendezVousStatus, string> = {
      EN_ATTENTE: 'bg-red-100 text-red-700',
      CONFIRME:   'bg-orange-100 text-orange-700',
      TERMINE:    'bg-green-100 text-green-700',
      REFUSE:     'bg-gray-100 text-gray-500',
      ANNULE:     'bg-gray-100 text-gray-500',
    };
    return map[s] ?? '';
  }

  getStatutLabel(rdv: RendezVous): string {
    if (rdv.hasFicheAtelier || rdv.statut === 'TERMINE') {
      return 'Fiche atelier créée';
    }
    return this.statutLabel(rdv.statut);
  }

  getStatutClass(rdv: RendezVous): string {
    if (rdv.hasFicheAtelier || rdv.statut === 'TERMINE') {
      return this.statutClass('TERMINE');
    }
    return this.statutClass(rdv.statut);
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
