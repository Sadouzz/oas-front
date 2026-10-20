import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrdreTravailService } from './ordre-travail.service';
import {
  OrdreTravail,
  StatutOrdreTravail,
  ETAPES_ORDRE_TRAVAIL,
  getStatutColorOT,
  getEtapeFromStatutOT,
  getPathFromEtapeOT
} from './models/ordre-travail.model';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { ConfirmationService } from '../../shared/components/confirmation/confirmation.service';

@Component({
  selector: 'app-ordres-travail',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, AlertComponent],
  templateUrl: './ordres-travail.component.html'
})
export class OrdresTravailComponent implements OnInit {
  private confirmation = inject(ConfirmationService);
  private otService = inject(OrdreTravailService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ordres: OrdreTravail[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Filtres & Pagination
  searchTerm = '';
  selectedStatut = '';
  filterDateDebut = '';
  filterDateFin = '';
  statutSteps = ETAPES_ORDRE_TRAVAIL;
  statutsDisponibles = Object.values(StatutOrdreTravail);
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedStatut || this.filterDateDebut || this.filterDateFin);
  }

  // Modal Création OT
  showCreateModal = false;
  creationMode: 'DEPUIS_OR' | 'DEPUIS_PROFORMA' | 'MANUEL' = 'DEPUIS_PROFORMA';
  proformaIdInput: number | null = null;
  ordreReparationIdInput: number | null = null;
  descriptionTravauxInput = '';
  creatingOT = false;

  ngOnInit(): void {
    this.loadOrdres();
  }

  loadOrdres(): void {
    this.loading = true;
    this.errorMessage = '';
    this.otService.getAll({
      search: this.searchTerm.trim() || undefined,
      statut: this.selectedStatut || undefined,
      dateDebut: this.filterDateDebut || undefined,
      dateFin: this.filterDateFin || undefined,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (res) => {
        this.ordres = res?.content || [];
        this.totalElements = res?.totalElements || 0;
        this.totalPages = res?.totalPages || 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des ordres de travail.';
        this.cdr.markForCheck();
      }
    });
  }

  onSearchInput(event: any): void {
    this.searchTerm = event.target.value;
    this.currentPage = 0;
    this.loadOrdres();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 0;
    this.loadOrdres();
  }

  onStatutFilterChange(): void {
    this.currentPage = 0;
    this.loadOrdres();
  }

  onFilterDate(): void {
    this.currentPage = 0;
    this.loadOrdres();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatut = '';
    this.filterDateDebut = '';
    this.filterDateFin = '';
    this.currentPage = 0;
    this.loadOrdres();
  }

  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadOrdres();
    }
  }

  ouvrirStepper(ot: OrdreTravail): void {
    const etape = ot.etape || getEtapeFromStatutOT(ot.statut);
    const path = getPathFromEtapeOT(etape);
    this.router.navigate(['/app/ordres-travail', ot.id, path]);
  }

  async supprimerOT(ot: OrdreTravail, event: Event): Promise<void> {
    event.stopPropagation();
    if (!await this.confirmation.confirm(`Êtes-vous sûr de vouloir supprimer l'Ordre de Travail ${ot.numero} ?`)) return;
    this.otService.delete(ot.id).subscribe({
      next: () => {
        this.successMessage = `Ordre de travail ${ot.numero} supprimé.`;
        this.loadOrdres();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de la suppression.';
        this.cdr.markForCheck();
      }
    });
  }

  openNewModal(): void {
    this.showCreateModal = true;
    this.proformaIdInput = null;
    this.ordreReparationIdInput = null;
    this.descriptionTravauxInput = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeNewModal(): void {
    this.showCreateModal = false;
  }

  submitCreateOT(): void {
    this.creatingOT = true;
    this.errorMessage = '';

    if (this.creationMode === 'DEPUIS_PROFORMA') {
      if (!this.proformaIdInput) {
        this.errorMessage = 'Veuillez saisir un ID de Proforma validé.';
        this.creatingOT = false;
        return;
      }
      this.otService.createFromProforma(this.proformaIdInput).subscribe({
        next: (ot) => {
          this.creatingOT = false;
          this.showCreateModal = false;
          this.ouvrirStepper(ot);
        },
        error: (err) => {
          this.creatingOT = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la création de l\'OT depuis le Proforma.';
          this.cdr.markForCheck();
        }
      });
    } else if (this.creationMode === 'DEPUIS_OR') {
      if (!this.ordreReparationIdInput) {
        this.errorMessage = 'Veuillez saisir un ID d\'Ordre de Réparation.';
        this.creatingOT = false;
        return;
      }
      this.otService.createFromOrdreReparation(this.ordreReparationIdInput).subscribe({
        next: (ot) => {
          this.creatingOT = false;
          this.showCreateModal = false;
          this.ouvrirStepper(ot);
        },
        error: (err) => {
          this.creatingOT = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la création de l\'OT depuis l\'OR.';
          this.cdr.markForCheck();
        }
      });
    } else {
      // Manuel
      this.otService.create({
        descriptionTravaux: this.descriptionTravauxInput
      }).subscribe({
        next: (ot) => {
          this.creatingOT = false;
          this.showCreateModal = false;
          this.ouvrirStepper(ot);
        },
        error: (err) => {
          this.creatingOT = false;
          this.errorMessage = err.error?.message || 'Erreur lors de la création manuelle de l\'OT.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  getStatutBadgeClass(statut: string | undefined): string {
    const c = getStatutColorOT(statut);
    return `${c.bg} ${c.text} ${c.border}`;
  }

  getEtapeNumero(ot: OrdreTravail): number {
    return ot.etape || getEtapeFromStatutOT(ot.statut);
  }

  getClientNom(ot: OrdreTravail): string {
    if (!ot) return '';
    if (ot.clientNom && ot.clientNom !== 'undefined undefined') return ot.clientNom;

    const c: any = ot.client || ot.vehicule?.client;
    if (!c) return '';
    if (typeof c === 'string') return c !== 'undefined undefined' ? c : '';
    if (c.clientNom && c.clientNom !== 'undefined undefined') return c.clientNom;
    if (c.fullName && c.fullName !== 'undefined undefined') return c.fullName;
    if (c.name && c.name !== 'undefined undefined') return c.name;

    const fn = (c.firstName || c.prenom || '').toString().trim();
    const ln = (c.lastName || c.nom || '').toString().trim();
    const full = `${fn} ${ln}`.trim();
    if (full && full !== 'undefined undefined' && full !== 'undefined') return full;

    return c.phone || c.email || '';
  }

  getClientPhone(ot: OrdreTravail): string {
    if (!ot) return '';
    const c: any = ot.client || ot.vehicule?.client;
    return c?.phone || c?.telephone || (ot as any).clientPhone || '';
  }
}
