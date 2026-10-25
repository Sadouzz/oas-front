import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { OrdreTravailService } from '../../../../ordres-travail/ordre-travail.service';
import { StepOrdreTravailResponseDto } from '../../../models/responses/step-ordre-travail-response.dto';
import { StatutOrdreReparation } from '../../../models/ordre-reparation.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { getEtapeFromStatutOT, getPathFromEtapeOT } from '../../../../ordres-travail/models/ordre-travail.model';

@Component({
  selector: 'app-step-ordre-travail',
  standalone: true,
  imports: [CommonModule, RouterLink, AlertComponent, DatePipe],
  templateUrl: './step-ordre-travail.component.html'
})
export class StepOrdreTravailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private otService = inject(OrdreTravailService);
  cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  data: StepOrdreTravailResponseDto | null = null;

  loading = true;
  creatingOT = false;
  advancing = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-reparation']);
      return;
    }
    this.ordreId = +idParam;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.ordreService.getStepOrdreTravail(this.ordreId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de l\'ordre de travail.';
        this.cdr.markForCheck();
      }
    });
  }

  get isOtTermine(): boolean {
    const s = this.otStatut;
    return s === 'TERMINE' || s === 'LIVRE' || this.data?.ordreTravail?.statut === 'TERMINE';
  }

  creerOrdreTravail(): void {
    this.creatingOT = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.otService.createFromOrdreReparation(this.ordreId).subscribe({
      next: (ot) => {
        this.creatingOT = false;
        this.successMessage = `Ordre de Travail ${ot.numero} initialisé avec succès.`;
        this.loadData();
      },
      error: (err) => {
        this.creatingOT = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la création de l\'ordre de travail.';
        this.cdr.markForCheck();
      }
    });
  }

  passerAuPaiement(): void {
    if (!this.isOtTermine) {
      this.errorMessage = "L'Ordre de Travail doit être au statut TERMINE pour pouvoir passer au paiement.";
      this.cdr.markForCheck();
      return;
    }

    if (['PAIEMENT', 'PRET_A_LIVRER', 'LIVRE'].includes(this.data?.statut ?? '')) {
      this.router.navigate(['/app/ordres-reparation', this.ordreId, 'paiement']);
      return;
    }

    this.advancing = true;
    this.errorMessage = '';

    this.ordreService.updateStatut(this.ordreId, 'PAIEMENT').subscribe({
      next: () => {
        this.advancing = false;
        this.router.navigate(['/app/ordres-reparation', this.ordreId, 'paiement']);
      },
      error: (err) => {
        this.advancing = false;
        this.errorMessage = err.error?.message || "Impossible de passer l'ordre de réparation à l'étape paiement.";
        this.cdr.markForCheck();
      }
    });
  }

  get otId(): number | null {
    return this.data?.ordreTravailId || this.data?.ordreTravail?.id || null;
  }

  get otNumero(): string {
    return this.data?.ordreTravailNumero || this.data?.ordreTravail?.numero || '—';
  }

  get otStatut(): string {
    return this.data?.ordreTravailStatut || this.data?.ordreTravail?.statut || 'NON_CREE';
  }

  get otEtape(): number {
    return this.data?.ordreTravailEtape || 1;
  }

  get otCurrentPath(): string {
    const etapeFromStatut = getEtapeFromStatutOT(this.otStatut);
    const etape = Math.max(etapeFromStatut, this.otEtape || 1);
    return getPathFromEtapeOT(etape);
  }

  getStepPath(stepNumber: number): string {
    return getPathFromEtapeOT(stepNumber);
  }

  get otEtapeLabel(): string {
    switch (this.otStatut) {
      case 'RECAPITULATIF':
        return 'Étape 1/5 · Récapitulatif Proforma';
      case 'BON_DE_SORTIE':
        return 'Étape 2/5 · Attente Bon de Sortie Magasin';
      case 'ASSIGN_TECHNICIEN':
        return 'Étape 3/5 · Affectation des Techniciens';
      case 'REPARATION':
        return 'Étape 4/5 · Exécution des Réparations en Atelier';
      case 'TERMINE':
        return 'Étape 5/5 · Travaux d\'Atelier Terminés';
      default:
        return 'En attente d\'exécution atelier';
    }
  }

  getStatutBadgeClass(statut: string): { bg: string; text: string; border: string } {
    switch (statut) {
      case 'RECAPITULATIF':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'BON_DE_SORTIE':
        return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
      case 'ASSIGN_TECHNICIEN':
        return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
      case 'REPARATION':
        return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
      case 'TERMINE':
        return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
    }
  }

  getClientDisplay(): string {
    const c = this.data?.client;
    if (!c) return 'Non renseigné';
    if (typeof c === 'string') return c;
    const prenom = c.firstName || c.prenom || '';
    const nom = c.lastName || c.nom || '';
    const full = `${prenom} ${nom}`.trim();
    return full || c.phone || 'Non renseigné';
  }
}
