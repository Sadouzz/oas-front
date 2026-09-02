import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RendezVousService } from './rendezvous.service';
import { TechnicienService } from '../techniciens/technicien.service';
import { RendezVous, RendezVousStatus, Technicien, extractContent } from '../../shared/models/index';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import {
  LucideSearch, LucideX, LucideCalendar, LucideCheck, LucidePencil, LucideUser, LucideFileText
} from '@lucide/angular';

@Component({
  selector: 'app-rendezvous',
  standalone: true,
  imports: [
    ReactiveFormsModule, AlertComponent, PaginationComponent,
    LucideSearch, LucideX, LucideCalendar, LucideCheck, LucidePencil, LucideFileText],
  templateUrl: './rendezvous.component.html',
})
export class RendezVousComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(RendezVousService);
  private technicienService = inject(TechnicienService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  rdvs: RendezVous[] = [];
  filtered: RendezVous[] = [];
  techniciens: Technicien[] = [];
  selectedTechnicienIds = new Set<number>();
  editedDate = '';

  loading = true;
  saving = false;
  showStatutModal = false;
  showValiderModal = false;
  editingRdv: RendezVous | null = null;

  searchText = '';
  filterStatut: RendezVousStatus | '' = '';

  page = 1;
  pageSize = 10;
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

  statutForm: FormGroup = this.fb.group({
    statut:      ['', Validators.required],
    commentaire: [''],
  });

  ngOnInit() {
    this.load();
    this.technicienService.getAll().subscribe({ next: data => this.techniciens = extractContent(data) });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => {
        this.rdvs = extractContent(data);
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.rdvs = [];
        this.filtered = [];
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilters() {
    let result = Array.isArray(this.rdvs) ? [...this.rdvs] : [];
    if (this.searchText) {
      const kw = this.searchText.toLowerCase();
      result = result.filter(r =>
        r.clientName?.toLowerCase().includes(kw) ||
        (r.motif ?? '').toLowerCase().includes(kw) ||
        (r.vehiculeImmatriculation ?? '').toLowerCase().includes(kw)
      );
    }
    if (this.filterStatut) {
      result = result.filter(r => r.statut === this.filterStatut);
    }
    this.filtered = result;
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchText = (e.target as HTMLInputElement).value;
    this.applyFilters();
  }

  onStatutFilter(e: Event) {
    this.filterStatut = (e.target as HTMLSelectElement).value as RendezVousStatus | '';
    this.applyFilters();
  }

  openStatut(rdv: RendezVous) {
    this.editingRdv = rdv;
    this.modalErrorMessage = '';
    this.modalSuccessMessage = '';
    this.statutForm.patchValue({ statut: rdv.statut, commentaire: rdv.commentaire ?? '' });
    this.showStatutModal = true;
  }

  openValider(rdv: RendezVous) {
    this.editingRdv = rdv;
    this.selectedTechnicienIds = new Set();
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

    const technicienIds = Array.from(this.selectedTechnicienIds);

    const doValider = () => {
      this.service.valider(this.editingRdv!.id, technicienIds).subscribe({
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

  toggleTechnicien(id: number) {
    if (this.selectedTechnicienIds.has(id)) {
      this.selectedTechnicienIds.delete(id);
    } else {
      this.selectedTechnicienIds.add(id);
    }
  }

  createFicheAtelier(rdv: RendezVous) {
    this.router.navigate(['/agent/admin/fiches-atelier/new', rdv.id]);
  }

  get paged(): RendezVous[] {
    const list = Array.isArray(this.filtered) ? this.filtered : [];
    return list.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number {
    const list = Array.isArray(this.filtered) ? this.filtered : [];
    return Math.max(1, Math.ceil(list.length / this.pageSize));
  }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

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
