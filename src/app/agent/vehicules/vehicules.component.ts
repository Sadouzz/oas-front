import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, takeUntil } from 'rxjs/operators';
import { VehiculeService } from './vehicule.service';
import { ClientService } from '../clients/client.service';
import { UserModel, VehiculeModel, extractContent } from '../../shared/models/index';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';

@Component({
  selector: 'app-vehicules',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, AlertComponent, PaginationComponent],
  templateUrl: './vehicules.component.html',
})
export class VehiculesComponent extends BasePaginatedComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private vehiculeService = inject(VehiculeService);
  private clientService = inject(ClientService);

  vehicules: VehiculeModel[] = [];
  filtered: VehiculeModel[] = [];
  clients: UserModel[] = [];
  selectedClient: UserModel | null = null;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  showModal = false;
  isNew = false;
  editingId = null as number | null;

  // 2-step creation
  createStep = 1;
  pendingVehicle: any = null;

  filterMarque = '';
  filterClientId: number | null = null;

  // Step 1 form (vehicle info)
  infoForm = this.fb.group({
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    annee: [null as number | null],
    kilometrage: [null as number | null],
    numeroChassis: [''],
  });

  // Step 2 form (select client)
  clientForm = this.fb.group({
    clientId: [null as number | null, Validators.required],
  });

  editingClient: UserModel | null = null;

  clientOpen = false;
  clientFilter = '';
  loadingClients = false;

  private clientSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  get clientLabel(): string {
    if (this.selectedClient) {
      return `${this.selectedClient.firstName || ''} ${this.selectedClient.lastName || ''}`.trim();
    }
    const id = this.clientForm.get('clientId')?.value;
    if (!id) return '';
    const c = this.clients.find(x => x.id === Number(id));
    return c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '';
  }

  get filteredClients(): UserModel[] {
    return this.clients || [];
  }

  selectClient(c: UserModel) {
    this.selectedClient = c;
    this.clientForm.patchValue({ clientId: c.id });
    this.clientFilter = '';
    this.clientOpen = false;
    this.cdr.markForCheck();
  }

  onClientSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.clientFilter = val;
    this.clientSearch$.next(val);
  }

  onClientFocus() {
    this.clientOpen = true;
    this.clientFilter = '';
    this.loadClients();
  }

  clearSelectedClient() {
    this.selectedClient = null;
    this.clientForm.patchValue({ clientId: null });
    this.clientFilter = '';
    this.loadClients();
    this.cdr.markForCheck();
  }

  // Edit form (all fields except client — client cannot be changed after creation)
  editForm = this.fb.group({
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    annee: [null as number | null],
    kilometrage: [null as number | null],
    numeroChassis: [''],
  });

  ngOnInit() {
    this.loadData();
    this.setupClientSearch();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupClientSearch() {
    this.clientSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(keyword => {
        this.loadingClients = true;
        this.cdr.markForCheck();
        const kw = keyword?.trim() || '';
        const params: any = { size: 10 };
        if (kw) params.keyword = kw;
        return this.clientService.getAll(params).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res: any) => {
        this.clients = extractContent<UserModel>(res);
        this.loadingClients = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadData() {
    this.loadVehicules();
  }

  loadClients(keyword: string = '') {
    this.loadingClients = true;
    const params: any = { size: 10 };
    if (keyword?.trim()) params.keyword = keyword.trim();
    this.clientService.getAll(params).subscribe({
      next: (res: any) => {
        this.clients = extractContent<UserModel>(res);
        this.loadingClients = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingClients = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadVehicules() {
    this.loading = true;
    const params = this.getPageParams();
    if (this.filterMarque) params['marque'] = this.filterMarque;
    if (this.filterClientId) params['clientId'] = this.filterClientId;

    this.vehiculeService.getAll(params).subscribe({
      next: (res: any) => {
        const list = this.applyPageResponse<VehiculeModel>(res);
        this.vehicules = list.sort((a: any, b: any) => b.id - a.id);
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Impossible de charger les véhicules. Vérifiez que le serveur est démarré.';
        this.cdr.markForCheck();
      }
    });
  }

  get marques(): string[] {
    return [...new Set(this.vehicules.map(v => v.marque).filter(Boolean))].sort();
  }

  applyFilter() {
    let data = this.vehicules;
    if (this.filterMarque) data = data.filter(v => v.marque === this.filterMarque);
    if (this.filterClientId != null) data = data.filter(v => v.client?.id === this.filterClientId);
    if (this.searchTerm) {
      const kw = this.searchTerm;
      data = data.filter(v =>
        v.immatriculation.toLowerCase().includes(kw) ||
        v.marque.toLowerCase().includes(kw) ||
        v.modele.toLowerCase().includes(kw) ||
        `${v.client?.firstName} ${v.client?.lastName}`.toLowerCase().includes(kw)
      );
    }
    this.filtered = data;
  }

  // onSearch is inherited from BasePaginatedComponent

  onMarqueFilter(event: Event) {
    this.filterMarque = (event.target as HTMLSelectElement).value;
    this.page = 1;
    this.loadVehicules();
  }

  onClientFilter(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.filterClientId = val ? Number(val) : null;
    this.page = 1;
    this.loadVehicules();
  }

  get paged(): VehiculeModel[] { return this.filtered; }

  // ── CREATE 2-STEP ──────────────────────────────────────────────
  openCreate() {
    this.isNew = true;
    this.editingId = null;
    this.createStep = 1;
    this.pendingVehicle = null;
    this.selectedClient = null;
    this.infoForm.reset();
    this.clientForm.reset();
    this.clientOpen = false;
    this.clientFilter = '';
    this.errorMessage = '';
    this.showModal = true;
  }

  nextStep() {
    if (this.infoForm.invalid) { this.infoForm.markAllAsTouched(); return; }
    this.pendingVehicle = this.infoForm.value;
    this.createStep = 2;
    this.errorMessage = '';
    this.clientFilter = '';
    this.loadClients();
  }

  prevStep() {
    this.createStep = 1;
    this.errorMessage = '';
  }

  // ── EDIT ───────────────────────────────────────────────────────
  openEdit(v: VehiculeModel) {
    this.isNew = false;
    this.editingId = v.id;
    this.editingClient = (v.client as any) || null;
    this.createStep = 1;
    this.errorMessage = '';
    this.editForm.patchValue({
      immatriculation: v.immatriculation,
      marque: v.marque,
      modele: v.modele,
      annee: v.annee ?? null,
      kilometrage: v.kilometrage ?? null,
      numeroChassis: v.numeroChassis ?? '',
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  save() {
    if (this.isNew) {
      if (this.clientForm.invalid || this.saving) { this.clientForm.markAllAsTouched(); return; }
      this.saving = true;
      const formVal = this.pendingVehicle || {};
      const payload = {
        immatriculation: formVal.immatriculation?.trim(),
        marque: formVal.marque?.trim(),
        modele: formVal.modele?.trim(),
        annee: formVal.annee ? Number(formVal.annee) : null,
        kilometrage: formVal.kilometrage != null && formVal.kilometrage !== '' ? Number(formVal.kilometrage) : null,
        numeroChassis: formVal.numeroChassis?.trim() || null,
        clientId: this.clientForm.value.clientId ? Number(this.clientForm.value.clientId) : null
      };
      this.vehiculeService.create(payload as any).subscribe({
        next: () => { this.saving = false; this.showSuccess('Véhicule créé avec succès !'); this.closeModal(); this.loadVehicules(); },
        error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la création.'; this.cdr.markForCheck(); }
      });
    } else {
      if (this.editForm.invalid || this.saving) { this.editForm.markAllAsTouched(); return; }
      this.saving = true;
      const formVal = this.editForm.value as any;
      const payload = {
        immatriculation: formVal.immatriculation?.trim(),
        marque: formVal.marque?.trim(),
        modele: formVal.modele?.trim(),
        annee: formVal.annee ? Number(formVal.annee) : null,
        kilometrage: formVal.kilometrage != null && formVal.kilometrage !== '' ? Number(formVal.kilometrage) : null,
        numeroChassis: formVal.numeroChassis?.trim() || null,
        clientId: this.editingClient?.id ?? null
      };
      this.vehiculeService.update(this.editingId!, payload as any).subscribe({
        next: () => { this.saving = false; this.showSuccess('Véhicule modifié avec succès !'); this.closeModal(); this.loadVehicules(); },
        error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur lors de la modification.'; this.cdr.markForCheck(); }
      });
    }
  }

  deleteVehicule(v: VehiculeModel) {
    if (!confirm(`Supprimer le véhicule ${v.immatriculation} ? Cette action est irréversible.`)) return;
    this.vehiculeService.delete(v.id).subscribe({
      next: () => { this.showSuccess('Véhicule supprimé.'); this.loadVehicules(); },
      error: (err: any) => { this.errorMessage = err.error?.message || 'Erreur lors de la suppression.'; this.cdr.markForCheck(); }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    this.cdr.markForCheck();
    setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 3500);
  }

  get fInfo() { return this.infoForm.controls; }
  get fClient() { return this.clientForm.controls; }
  get fEdit() { return this.editForm.controls; }
}
