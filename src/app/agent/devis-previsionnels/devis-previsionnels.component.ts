import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DevisPrevisionnelService, DevisPrevisionnel } from './devis-previsionnel.service';
import { ClientService, ClientModel } from '../clients/client.service';
import { VehiculeService, VehiculeModel } from '../vehicules/vehicule.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { extractContent } from '../../shared/models';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideArrowRight } from '@lucide/angular';

@Component({
  selector: 'app-devis-previsionnels',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DecimalPipe, AlertComponent, PaginationComponent, LucidePlus],
  templateUrl: './devis-previsionnels.component.html',
})
export class DevisPrevisionnelsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(DevisPrevisionnelService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  devis: DevisPrevisionnel[] = [];
  filtered: DevisPrevisionnel[] = [];
  clients: ClientModel[] = [];
  vehicules: VehiculeModel[] = [];
  loading = true;
  saving = false;
  showModal = false;
  isNew = true;
  editingId: number | null = null;
  page = 1;
  pageSize = 10;
  successMessage = '';
  errorMessage = '';

  filterClientId = '';
  searchTerm = '';

  form: FormGroup = this.fb.group({
    clientId: [null, Validators.required],
    vehiculeId: [null, Validators.required],
    notesReparation: ['', Validators.required],
    montantTotal: [null, [Validators.required, Validators.min(0)]],
    kilometrageVehicule: [null, [Validators.required, Validators.min(0)]],
  });

  ngOnInit() {
    this.load();
    this.clientService.getAll().subscribe({ next: c => this.clients = extractContent(c), error: () => {} });
    this.vehiculeService.getAll().subscribe({ next: v => this.vehicules = extractContent(v), error: () => {} });

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openNew();
      }
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => {
        this.devis = extractContent(data).sort((a: any, b: any) => b.id - a.id);
        this.applyFilter();
        this.cdr.markForCheck();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => this.loading = false,
    });
  }

  applyFilter() {
    let data = this.devis;
    if (this.filterClientId) data = data.filter(d => String(d.client?.id) === this.filterClientId);
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      data = data.filter(d =>
        (d.client?.firstName ?? '').toLowerCase().includes(kw) ||
        (d.client?.lastName ?? '').toLowerCase().includes(kw) ||
        (d.vehicule?.immatriculation ?? '').toLowerCase().includes(kw) ||
        d.notesReparation.toLowerCase().includes(kw)
      );
    }
    this.filtered = data;
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter(); this.cdr.markForCheck();
  }

  onClientFilter(e: Event) {
    this.filterClientId = (e.target as HTMLSelectElement).value;
    this.applyFilter(); this.cdr.markForCheck();
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
      next: () => { this.showModal = false; this.load(); this.notify('Devis enregistré.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la sauvegarde.'); },
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce devis ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.notify('Devis supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  valider(id: number) {
    if (!confirm('Voulez-vous vraiment forcer la validation de ce devis ?')) return;
    this.service.valider(id).subscribe({
      next: () => { this.load(); this.notify('Devis validé avec succès.'); },
      error: () => this.notifyError('Erreur lors de la validation du devis.'),
    });
  }

  get paged(): DevisPrevisionnel[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

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
