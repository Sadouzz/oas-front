import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TechnicienPortalService } from '../services/technicien-portal.service';
import { OrdreReparation } from '../../shared/models';

@Component({
  selector: 'app-technicien-ordres-list',
  standalone: true,
  templateUrl: './technicien-ordres-list.component.html',
})
export class TechnicienOrdresListComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(TechnicienPortalService);
  private router = inject(Router);

  ordres: OrdreReparation[] = [];
  loading = true;
  errorMessage = '';

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getMesOrdresReparation().subscribe({
      next: data => { this.ordres = data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); this.errorMessage = 'Erreur de chargement des ordres de réparation.'; },
    });
  }

  open(id: number) {
    this.router.navigate(['/technicien/ordres-reparation', id]);
  }

  statutLabel(s: string): string {
    const labels: Record<string, string> = {
      A_FAIRE: 'À faire',
      EN_DIAGNOSTIC: 'Diagnostic en cours',
      EN_ATTENTE_PROFORMA: 'En attente proforma',
      PROFORMA_VALIDE: 'Proforma validé',
      EN_ATTENTE_COMMANDE: 'En attente commande',
      EN_ATTENTE_SORTIE: 'En attente sortie',
      EN_ATTENTE_MECANICIEN: 'En attente assignation',
      EN_COURS: 'Réparation en cours',
      EN_ATTENTE_PAIEMENT: 'En attente paiement',
      TERMINE: 'Terminé',
      LIVRE: 'Livré',
    };
    return labels[s] ?? s;
  }

  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }
}
