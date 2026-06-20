import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RendezVousService } from '../services/rendezvous.service';
import { MecanicienService } from '../services/mecanicien.service';
import { RendezVous, RendezVousStatus, Mecanicien } from '../shared/models';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import {
  LucideSearch, LucideX, LucideCalendar, LucideCheck, LucidePencil, LucideUser,
} from '@lucide/angular';

@Component({
  selector: 'app-rendezvous',
  standalone: true,
  imports: [
    ReactiveFormsModule, AlertComponent, PaginationComponent,
    LucideSearch, LucideX, LucideCheck, LucidePencil],
  templateUrl: './rendezvous.component.html',
})
export class RendezVousComponent implements OnInit {
  private service = inject(RendezVousService);
  private mecanicienService = inject(MecanicienService);
  private fb = inject(FormBuilder);

  rdvs: RendezVous[] = [];
  filtered: RendezVous[] = [];
  mecaniciens: Mecanicien[] = [];
  selectedMecanicienIds = new Set<number>();

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

  readonly statutOptions: { value: RendezVousStatus; label: string }[] = [
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'CONFIRME',   label: 'Confirmé'  },
    { value: 'REFUSE',     label: 'Refusé'    },
    { value: 'ANNULE',     label: 'Annulé'    },
    { value: 'TERMINE',    label: 'Terminé'   },
  ];

  statutForm: FormGroup = this.fb.group({
    statut:      ['', Validators.required],
    commentaire: [''],
  });

  ngOnInit() {
    this.load();
    this.mecanicienService.getAll().subscribe({ next: data => this.mecaniciens = data });
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
    this.statutForm.patchValue({ statut: rdv.statut, commentaire: rdv.commentaire ?? '' });
    this.showStatutModal = true;
  }

  openValider(rdv: RendezVous) {
    this.editingRdv = rdv;
    this.selectedMecanicienIds = new Set();
    this.showValiderModal = true;
  }

  saveStatut() {
    if (this.statutForm.invalid || !this.editingRdv) { this.statutForm.markAllAsTouched(); return; }
    this.saving = true;
    const { statut, commentaire } = this.statutForm.value;
    this.service.updateStatut(this.editingRdv.id, statut, commentaire || undefined).subscribe({
      next: () => { this.showStatutModal = false; this.load(); this.notify('Statut mis à jour.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la mise à jour.'); },
    });
  }

  saveValider() {
    if (!this.editingRdv) return;
    if (this.selectedMecanicienIds.size === 0) {
      this.notifyError('Sélectionnez au moins un mécanicien.');
      return;
    }
    this.saving = true;
    this.service.valider(this.editingRdv.id, Array.from(this.selectedMecanicienIds)).subscribe({
      next: () => { this.showValiderModal = false; this.load(); this.notify('Rendez-vous validé. Fiche atelier créée.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la validation.'); },
    });
  }

  toggleMecanicien(id: number) {
    if (this.selectedMecanicienIds.has(id)) {
      this.selectedMecanicienIds.delete(id);
    } else {
      this.selectedMecanicienIds.add(id);
    }
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
      EN_ATTENTE: 'bg-amber-100 text-amber-700',
      CONFIRME:   'bg-green-100 text-green-700',
      REFUSE:     'bg-red-100 text-red-700',
      ANNULE:     'bg-gray-100 text-gray-500',
      TERMINE:    'bg-blue-100 text-blue-700',
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
