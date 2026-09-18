import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TechnicienPortalService, OrdreReparationTechnicienSummary } from '../services/technicien-portal.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';

export type TechnicienFilterTab = 'ALL' | 'DIAGNOSTIC' | 'REPARATION' | 'TERMINE';

@Component({
  selector: 'app-technicien-ordres-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './technicien-ordres-list.component.html',
})
export class TechnicienOrdresListComponent extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(TechnicienPortalService);
  private router = inject(Router);

  ordres: OrdreReparationTechnicienSummary[] = [];
  allOrdresForStats: OrdreReparationTechnicienSummary[] = [];
  loading = true;
  errorMessage = '';

  override searchTerm = '';
  activeTab: TechnicienFilterTab = 'ALL';

  ngOnInit() {
    this.loadData();
    this.loadAllForStats();
  }

  override loadData() {
    this.loading = true;
    this.errorMessage = '';
    this.service.getMesOrdresReparation(this.page - 1, this.pageSize).subscribe({
      next: res => {
        this.ordres = this.applyPageResponse<OrdreReparationTechnicienSummary>(res);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erreur de chargement des ordres de réparation.';
        this.cdr.markForCheck();
      },
    });
  }

  loadAllForStats() {
    this.service.getMesOrdresReparation(0, 100).subscribe({
      next: res => {
        this.allOrdresForStats = (res?.content || res || []) as OrdreReparationTechnicienSummary[];
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  get stats() {
    const list = this.allOrdresForStats.length > 0 ? this.allOrdresForStats : this.ordres;
    const total = list.length;
    const diagnostic = list.filter(o => this.isDiagnostic(o.statut)).length;
    const reparation = list.filter(o => this.isReparation(o.statut)).length;
    const termine = list.filter(o => this.isTermine(o.statut)).length;
    return { total, diagnostic, reparation, termine };
  }

  isDiagnostic(s: string): boolean {
    return ['DIAGNOSTIC', 'EN_DIAGNOSTIC', 'RECEPTION', 'A_FAIRE'].includes(s);
  }

  isReparation(s: string): boolean {
    return ['REPARATION', 'EN_COURS', 'PIECES_MO', 'EN_ATTENTE_PIECES_MO', 'BON_DE_SORTIE', 'EN_ATTENTE_SORTIE'].includes(s);
  }

  isTermine(s: string): boolean {
    return ['TERMINE', 'PRET_A_LIVRER', 'LIVRE'].includes(s);
  }

  get filteredOrdres(): OrdreReparationTechnicienSummary[] {
    let list = this.ordres;

    if (this.activeTab === 'DIAGNOSTIC') {
      list = list.filter(o => this.isDiagnostic(o.statut));
    } else if (this.activeTab === 'REPARATION') {
      list = list.filter(o => this.isReparation(o.statut));
    } else if (this.activeTab === 'TERMINE') {
      list = list.filter(o => this.isTermine(o.statut));
    }

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.trim().toLowerCase();
      list = list.filter(o =>
        (o.numero && o.numero.toLowerCase().includes(q)) ||
        (o.vehicule?.immatriculation && o.vehicule.immatriculation.toLowerCase().includes(q)) ||
        (o.vehicule?.marque && o.vehicule.marque.toLowerCase().includes(q)) ||
        (o.vehicule?.modele && o.vehicule.modele.toLowerCase().includes(q))
      );
    }

    return list;
  }

  setTab(tab: TechnicienFilterTab) {
    this.activeTab = tab;
  }

  onPageChange(newPage: number) {
    this.goToPage(newPage);
  }

  open(id: number) {
    this.router.navigate(['/technicien/ordres-reparation', id]);
  }

  statutLabel(s: string): string {
    const labels: Record<string, string> = {
      RECEPTION: 'Réception',
      A_FAIRE: 'À faire',
      DIAGNOSTIC: 'Diagnostic',
      EN_DIAGNOSTIC: 'Diagnostic en cours',
      PIECES_MO: 'Pièces & MO',
      EN_ATTENTE_PIECES_MO: 'En attente pièces & MO',
      PROFORMA: 'Proforma',
      EN_ATTENTE_PROFORMA: 'En attente proforma',
      PROFORMA_VALIDE: 'Proforma validé',
      BON_DE_COMMANDE: 'Approv.',
      EN_ATTENTE_COMMANDE: 'En attente commande',
      BON_DE_SORTIE: 'Attente BS',
      EN_ATTENTE_SORTIE: 'En attente sortie',
      ASSIGN_TECHNICIEN: 'Assign. Tech.',
      EN_ATTENTE_MECANICIEN: 'En attente assignation',
      REPARATION: 'Réparation',
      EN_COURS: 'Réparation en cours',
      PAIEMENT: 'Paiement',
      EN_ATTENTE_PAIEMENT: 'En attente paiement',
      PRET_A_LIVRER: 'Prêt à livrer',
      TERMINE: 'Terminé',
      LIVRE: 'Livré',
    };
    return labels[s] ?? s;
  }

  statutBadgeClass(s: string): string {
    if (this.isTermine(s)) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (this.isReparation(s)) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (this.isDiagnostic(s)) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  }

  formatDate(d: string): string {
    return d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  }
}
