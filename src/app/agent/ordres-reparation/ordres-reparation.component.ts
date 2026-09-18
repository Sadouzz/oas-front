import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrdreReparationService } from './ordre-reparation.service';
import { ProformaService } from '../proforma/proforma.service';
import { FactureService } from '../factures/facture.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import {
  OrdreReparation,
  StatutOrdre,
} from '../../shared/models';

export const STATUT_STEPS: { statut: StatutOrdre; label: string }[] = [
  { statut: 'A_FAIRE', label: 'Réception' },
  { statut: 'EN_DIAGNOSTIC', label: 'Diagnostic' },
  { statut: 'EN_ATTENTE_PIECES_MO', label: 'Pièces & MO' },
  { statut: 'EN_ATTENTE_PROFORMA', label: 'Proforma' },
  { statut: 'PROFORMA_VALIDE', label: 'Devis validé' },
  { statut: 'EN_ATTENTE_COMMANDE', label: 'Approv.' },
  { statut: 'EN_ATTENTE_SORTIE', label: 'Attente BS' },
  { statut: 'EN_ATTENTE_MECANICIEN', label: 'Assign. Tech.' },
  { statut: 'EN_COURS', label: 'Réparation' },
  { statut: 'EN_ATTENTE_PAIEMENT', label: 'Paiement' },
  { statut: 'TERMINE', label: 'Prêt' },
  { statut: 'LIVRE', label: 'Livré' },
];

@Component({
  selector: 'app-ordres-reparation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgClass,
    NgStyle,
    RouterLink,
    AlertComponent,
    PaginationComponent
  ],
  templateUrl: './ordres-reparation.component.html',
})
export class OrdresReparationComponent extends BasePaginatedComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private service = inject(OrdreReparationService);
  private proformaService = inject(ProformaService);
  private factureService = inject(FactureService);

  // ─── Liste & Filtres ──────────────────────────────────
  ordres: OrdreReparation[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  showWorkflow = false;

  filterStatut: string = '';
  filterDateDebut: string = '';
  filterDateFin: string = '';
  private searchTimeout: any;

  // ─── Tiroir de détail ─────────────────────────────────
  selectedOrdre: OrdreReparation | null = null;
  detailLoading = false;
  selectedOrdreProforma: any = null;
  selectedOrdreInvoice: any = null;
  invoiceCreated = false;

  readonly statutSteps = STATUT_STEPS;

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  override loadData(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const extra: Record<string, any> = {};
    if (this.filterStatut) extra['statut'] = this.filterStatut;
    if (this.filterDateDebut) extra['dateDebut'] = this.filterDateDebut;
    if (this.filterDateFin) extra['dateFin'] = this.filterDateFin;

    const params = this.getPageParams(extra);

    this.service.getAll(params).subscribe({
      next: (res: any) => {
        this.ordres = this.applyPageResponse<OrdreReparation>(res);
        this.loading = false;
        this.cdr.markForCheck();

        if (this.selectedOrdre) {
          const found = this.ordres.find(o => o.id === this.selectedOrdre?.id);
          if (found) {
            this.selectedOrdre = found;
          }
        }
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.notifyError('Erreur de chargement des ordres de réparation');
      }
    });
  }

  get paged(): OrdreReparation[] {
    return this.ordres;
  }

  // ─── Actions Navigation ───────────────────────────────
  openNew(): void {
    this.router.navigate(['/app/ordres-reparation/nouveau']);
  }

  statutToStepPath(statut?: string | null): string {
    switch (statut) {
      case 'A_FAIRE': return 'reception';
      case 'EN_DIAGNOSTIC': return 'diagnostic';
      case 'EN_ATTENTE_PIECES_MO': return 'pieces-mo';
      case 'EN_ATTENTE_PROFORMA': return 'proforma';
      case 'PROFORMA_VALIDE': return 'approvisionnement';
      case 'EN_ATTENTE_COMMANDE': return 'approvisionnement';
      case 'EN_ATTENTE_SORTIE': return 'bon-sortie';
      case 'EN_ATTENTE_MECANICIEN': return 'assignation';
      case 'EN_COURS': return 'reparation';
      case 'EN_ATTENTE_PAIEMENT': return 'paiement';
      case 'TERMINE': return 'livraison';
      case 'LIVRE': return 'cloture';
      default: return 'reception';
    }
  }

  openEdit(o: OrdreReparation): void {
    const target = this.statutToStepPath(o.statut);
    this.router.navigate(['/app/ordres-reparation', o.id, target]);
  }

  selectOrdre(o: OrdreReparation): void {
    if (this.selectedOrdre && this.selectedOrdre.id === o.id) {
      this.selectedOrdre = null;
      this.detailLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.selectedOrdre = o;
    this.detailLoading = true;
    this.selectedOrdreProforma = null;
    this.selectedOrdreInvoice = null;
    this.invoiceCreated = false;
    this.cdr.markForCheck();

    this.service.getById(o.id).subscribe({
      next: (fullOrdre: OrdreReparation) => {
        this.selectedOrdre = fullOrdre;
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.detailLoading = false;
        this.cdr.markForCheck();
      }
    });

    try {
      this.proformaService.getByOrdreReparationId(o.id).subscribe({
        next: (p) => { this.selectedOrdreProforma = p; this.cdr.markForCheck(); },
        error: () => { this.selectedOrdreProforma = null; this.cdr.markForCheck(); }
      });
    } catch (e) {}

    try {
      this.factureService.getAll().subscribe({
        next: (list: any[]) => {
          if (list && list.length) {
            const inv = list.find(it =>
              (it.ordreReparationId && Number(it.ordreReparationId) === Number(o.id)) ||
              (it.ordreReparation && Number(it.ordreReparation.id) === Number(o.id))
            );
            if (inv) {
              this.selectedOrdreInvoice = inv;
              this.invoiceCreated = true;
              this.cdr.markForCheck();
            }
          }
        },
        error: () => {}
      });
    } catch (e) {}
  }

  closeDetail(): void {
    this.selectedOrdre = null;
    this.selectedOrdreProforma = null;
    this.selectedOrdreInvoice = null;
    this.cdr.markForCheck();
  }

  delete(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ordre de réparation ?')) return;
    this.service.delete(id).subscribe({
      next: () => {
        this.notify('Ordre de réparation supprimé.');
        if (this.selectedOrdre?.id === id) {
          this.selectedOrdre = null;
        }
        this.loadData();
      },
      error: () => this.notifyError('Erreur lors de la suppression.')
    });
  }

  createFactureFromOrdre(): void {
    if (!this.selectedOrdre) return;
    this.openEdit(this.selectedOrdre);
  }

  // ─── Filtres & Recherche ──────────────────────────────
  onFilterStatut(): void {
    this.page = 1;
    this.loadData();
  }

  onFilterDate(): void {
    this.page = 1;
    this.loadData();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm = value;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.loadData();
    }, 400);
  }

  // ─── Helpers Visuels ──────────────────────────────────
  statutColor(o: OrdreReparation): string {
    switch (o?.statut) {
      case 'A_FAIRE': return '#ef4444';
      case 'EN_DIAGNOSTIC': return '#f59e0b';
      case 'EN_ATTENTE_PIECES_MO': return '#8b5cf6';
      case 'EN_ATTENTE_PROFORMA': return '#6366f1';
      case 'PROFORMA_VALIDE': return '#10b981';
      case 'EN_ATTENTE_COMMANDE': return '#ec4899';
      case 'EN_ATTENTE_SORTIE': return '#6366f1';
      case 'EN_ATTENTE_MECANICIEN': return '#06b6d4';
      case 'EN_COURS': return '#3b82f6';
      case 'EN_ATTENTE_PAIEMENT': return '#f97316';
      case 'TERMINE': return '#10b981';
      case 'LIVRE': return '#059669';
      default: return '#6b7280';
    }
  }

  statutLabel(o: OrdreReparation): string {
    const step = STATUT_STEPS.find(s => s.statut === o?.statut);
    return step ? step.label : (o?.statut ?? '—');
  }

  statutStepIndex(o: OrdreReparation): number {
    return STATUT_STEPS.findIndex(s => s.statut === o?.statut);
  }

  ordreInitials(o: OrdreReparation): string {
    if (!o?.numero) return 'OR';
    const parts = o.numero.split('-');
    return parts.length >= 2 ? parts.slice(-2).join('') : o.numero.substring(0, 3).toUpperCase();
  }

  formatDate(d?: string | null): string {
    if (!d) return '—';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return d;
    }
  }

  formatPrice(p?: number | null): string {
    if (p == null) return '0 FCFA';
    return p.toLocaleString('fr-FR') + ' FCFA';
  }

  private notify(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.markForCheck();
    }, 4000);
  }

  private notifyError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.markForCheck();
    }, 5000);
  }
}
