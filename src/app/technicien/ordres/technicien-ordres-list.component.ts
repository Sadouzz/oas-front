import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TechnicienPortalService, OrdreReparationTechnicienSummary } from '../services/technicien-portal.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';

@Component({
  selector: 'app-technicien-ordres-list',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './technicien-ordres-list.component.html',
})
export class TechnicienOrdresListComponent extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(TechnicienPortalService);
  private router = inject(Router);

  ordres: OrdreReparationTechnicienSummary[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit() {
    this.loadData();
  }

  loadData() {
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

      PRET_A_LIVRER: 'Prêt',
      TERMINE: 'Terminé',
      
      LIVRE: 'Livré',
    };
    return labels[s] ?? s;
  }

  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
}
