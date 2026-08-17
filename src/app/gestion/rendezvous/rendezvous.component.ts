import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RendezVousService } from '../../services/rendezvous.service';
import { TechnicienService } from '../../services/technicien.service';
import { RendezVous, RendezVousStatus, Technicien } from '../../shared/models/index';
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
    this.technicienService.getAll().subscribe({ next: data => this.techniciens = data });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.rdvs = data; this.applyFilters(); this.loading = false; },
      error: () => this.loading = false,
    });
  }

  applyFilters() {
    let result = [...this.rdvs];
    if (this.searchText) {
      const kw = this.searchText.toLowerCase();
      result = result.filter(r =>
        r.clientName.toLowerCase().includes(kw) ||
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

  /** Convertit une date ISO (back) en valeur compatible <input type="datetime-local">. */
  private toDatetimeLocal(iso: string): string {
    return iso ? iso.slice(0, 16) : '';
  }

  saveStatut() {
    if (this.statutForm.invalid || !this.editingRdv) { this.statutForm.markAllAsTouched(); return; }
    this.saving = true;
    const { statut, commentaire } = this.statutForm.value;
    this.service.updateStatut(this.editingRdv.id, statut, commentaire || undefined).subscribe({
      next: () => { this.showStatutModal = false; this.load(); this.notify('Statut mis à jour.'); },
      error: (err) => { this.saving = false; this.modalErrorMessage = err.error || 'Erreur lors de la mise à jour.'; },
    });
  }

  saveValider() {
    if (!this.editingRdv) return;
    this.saving = true;
    this.modalErrorMessage = '';

    const dateChanged = this.editedDate !== this.toDatetimeLocal(this.editingRdv.dateRendezVous);
    const technicienIds = Array.from(this.selectedTechnicienIds);

    const doValider = () => {
      this.service.valider(this.editingRdv!.id, technicienIds).subscribe({
        next: () => { this.showValiderModal = false; this.load(); this.notify('Rendez-vous validé. Ordre de réparation créée.'); },
        error: (err) => { this.saving = false; this.modalErrorMessage = err.error || 'Erreur lors de la validation.'; },
      });
    };

    if (dateChanged) {
      this.service.updateDate(this.editingRdv.id, this.editedDate).subscribe({
        next: () => doValider(),
        error: (err) => { this.saving = false; this.modalErrorMessage = err.error || 'Erreur lors de la modification de la date.'; },
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
    this.router.navigate(['/gestion/admin/fiches-atelier/new', rdv.id]);
  }

  get paged(): RendezVous[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
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
}
