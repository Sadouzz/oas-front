import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DevisPrevisionnelService } from './devis-previsionnel.service';
import { ClientService } from '../clients/client.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { DevisPrevisionnel, ClientModel, VehiculeModel, extractContent } from '../../shared/models';
import { LucidePlus } from '@lucide/angular';

@Component({
  selector: 'app-devis-previsionnels',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DecimalPipe, AlertComponent, PaginationComponent, LucidePlus],
  templateUrl: './devis-previsionnels.component.html',
})
export class DevisPrevisionnelsComponent extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(DevisPrevisionnelService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  devis: DevisPrevisionnel[] = [];
  clients: ClientModel[] = [];
  vehicules: VehiculeModel[] = [];
  loading = true;
  saving = false;
  showModal = false;
  isNew = true;
  editingId: number | null = null;
  successMessage = '';
  errorMessage = '';

  filterClientId = '';
  private searchTimeout: any;

  form: FormGroup = this.fb.group({
    clientId: [null, Validators.required],
    vehiculeId: [null, Validators.required],
    notesReparation: ['', Validators.required],
    montantTotal: [null, [Validators.required, Validators.min(0)]],
    kilometrageVehicule: [null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    this.clientService.getAll().subscribe({ next: c => this.clients = extractContent(c), error: () => {} });
    this.vehiculeService.getAll().subscribe({ next: v => this.vehicules = extractContent(v), error: () => {} });

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openNew();
      }
      if (params['clientId']) {
        this.filterClientId = params['clientId'];
      }
      if (params['search'] || params['keyword']) {
        this.searchTerm = (params['search'] || params['keyword']).toLowerCase().trim();
      }
      this.loadData();
    });
  }

  loadData() {
    this.loading = true;
    this.cdr.markForCheck();
    const params = this.getPageParams({
      clientId: this.filterClientId ? Number(this.filterClientId) : undefined,
    });
    this.service.getAll(params).subscribe({
      next: data => {
        this.devis = this.applyPageResponse<DevisPrevisionnel>(data);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.devis = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  override onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.loadData();
    }, 300);
  }

  onClientFilter(e: Event) {
    this.filterClientId = (e.target as HTMLSelectElement).value;
    this.page = 1;
    this.loadData();
  }

  openNew() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset();
    this.showModal = true;
  }

  openEdit(d: DevisPrevisionnel) {
    this.isNew = false;
    this.editingId = d.id;
    this.form.patchValue({
      clientId: d.client?.id ?? null,
      vehiculeId: d.vehicule?.id ?? null,
      notesReparation: d.notesReparation,
      montantTotal: d.montantTotal,
      kilometrageVehicule: d.kilometrageVehicule,
    });
    this.showModal = true;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const raw = this.form.value;
    const payload = {
      clientId: Number(raw.clientId),
      vehiculeId: Number(raw.vehiculeId),
      notesReparation: raw.notesReparation,
      montantTotal: Number(raw.montantTotal),
      kilometrageVehicule: Number(raw.kilometrageVehicule),
    };
    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    req$.subscribe({
      next: () => { this.showModal = false; this.loadData(); this.notify('Devis enregistré.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la sauvegarde.'); },
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce devis ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.loadData(); this.notify('Devis supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  valider(id: number) {
    if (!confirm('Voulez-vous vraiment forcer la validation de ce devis ?')) return;
    this.service.valider(id).subscribe({
      next: () => { this.loadData(); this.notify('Devis validé avec succès.'); },
      error: () => this.notifyError('Erreur lors de la validation du devis.'),
    });
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  formatMontant(n: number): string { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(n); }

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
}
