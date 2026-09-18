import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { OrdreReparationService } from '../ordre-reparation.service';
import { DiagnosticService } from '../../diagnostics/diagnostic.service';
import { VehiculeService } from '../../vehicules/vehicule.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { OrdreReparation, StatutOrdre, VehiculeModel } from '../../../shared/models';

export const STEP_ROUTES: { step: number; path: string; statut: StatutOrdre; label: string }[] = [
  { step: 1, path: 'reception', statut: 'A_FAIRE', label: 'Réception' },
  { step: 2, path: 'diagnostic', statut: 'EN_DIAGNOSTIC', label: 'Diagnostic' },
  { step: 3, path: 'pieces-mo', statut: 'EN_ATTENTE_PIECES_MO', label: 'Pièces & MO' },
  { step: 4, path: 'proforma', statut: 'EN_ATTENTE_PROFORMA', label: 'Proforma' },
  { step: 5, path: 'approvisionnement', statut: 'EN_ATTENTE_COMMANDE', label: 'Approv.' },
  { step: 6, path: 'bon-sortie', statut: 'EN_ATTENTE_SORTIE', label: 'Attente BS' },
  { step: 7, path: 'assignation', statut: 'EN_ATTENTE_MECANICIEN', label: 'Assign. Tech.' },
  { step: 8, path: 'reparation', statut: 'EN_COURS', label: 'Réparation' },
  { step: 9, path: 'paiement', statut: 'EN_ATTENTE_PAIEMENT', label: 'Paiement' },
  { step: 10, path: 'livraison', statut: 'TERMINE', label: 'Prêt' },
  { step: 11, path: 'cloture', statut: 'LIVRE', label: 'Livré' },
];

@Component({
  selector: 'app-ordre-reparation-detail',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    RouterLink,
    RouterOutlet
  ],
  templateUrl: './ordre-reparation-detail.component.html'
})
export class OrdreReparationDetailComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(OrdreReparationService);
  private diagnosticService = inject(DiagnosticService);
  private vehiculeService = inject(VehiculeService);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;
  selectedVehicule: VehiculeModel | null = null;
  loading = true;
  pollInterval: any;
  hasDiagnostic = false;

  currentStep = 1;
  statutSteps = STEP_ROUTES;
  activeChild: any = null;

  onActivate(componentRef: any): void {
    this.activeChild = componentRef;
    this.cdr.markForCheck();
  }

  isNextStepDisabled(): boolean {
    if (this.activeChild?.saving) return true;
    if (this.currentStep === 2) {
      const diagStatut = this.activeChild?.statutDiagnostic || this.loadedOrdre?.diagnostic?.statut;
      return diagStatut !== 'VALIDE';
    }
    if (this.currentStep === 3) {
      if (this.activeChild) {
        return !this.activeChild.hasAtLeastOneItem;
      }
      const nbPieces = this.loadedOrdre?.lignesOrdreReparationPieces?.length ?? 0;
      const nbMO = this.loadedOrdre?.lignesOrdreReparationMainDoeuvres?.length ?? 0;
      return (nbPieces === 0 && nbMO === 0);
    }
    return false;
  }

  validerEtapeCourante(): void {
    if (this.currentStep === 2) {
      const diagStatut = this.activeChild?.statutDiagnostic || this.loadedOrdre?.diagnostic?.statut;
      if (diagStatut !== 'VALIDE') {
        return;
      }
      this.goToStep(3);
      return;
    }
    if (this.currentStep === 3) {
      const canProceed = this.activeChild ? this.activeChild.hasAtLeastOneItem : true;
      if (!canProceed) {
        if (this.activeChild) {
          this.activeChild.errorMessage = "Veuillez ajouter au moins une pièce détachée ou une prestation de main-d'œuvre pour continuer.";
          this.activeChild.cdr?.markForCheck();
        }
        return;
      }
    }
    if (this.activeChild && typeof this.activeChild.validateStep === 'function') {
      this.activeChild.validateStep();
    } else {
      this.nextStep();
    }
  }

  getActionLabel(): string {
    switch (this.currentStep) {
      case 1:
        return 'Valider la réception';
      case 2:
        return 'Passer aux pièces & MO';
      case 3:
        return 'Valider les pièces & MO';
      case 4:
        return 'Valider le devis proforma';
      case 5:
        return this.activeChild?.hasRuptureStock ? 'Générer le Bon de Commande' : 'Passer au Bon de Sortie';
      case 6:
        return 'Créer le Bon de Sortie Magasin';
      case 7:
        return 'Démarrer les travaux';
      case 8:
        return 'Terminer les travaux';
      case 9:
        return 'Valider le paiement';
      case 10:
        return 'Enregistrer la livraison';
      default:
        return 'Étape suivante';
    }
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-reparation']);
      return;
    }
    this.ordreId = +idParam;
    this.loadOrdre();
    this.updateCurrentStepFromUrl();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateCurrentStepFromUrl();
      this.loadOrdreSilently();
    });

    //recupere les details chaque 8 secondes
    //this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.loadOrdreSilently();
    }, 8000);
  }

  loadOrdreSilently(): void {
    if (!this.ordreId) return;
    this.service.getById(this.ordreId).subscribe({
      next: (o: OrdreReparation) => {
        this.loadedOrdre = o;
        this.cdr.markForCheck();
      }
    });
  }

  private hasAutoRedirected = false;

  loadOrdre(): void {
    this.loading = true;
    this.service.getById(this.ordreId).subscribe({
      next: (o: OrdreReparation) => {
        this.loadedOrdre = o;
        this.selectedVehicule = o.vehicule as any;

        if (o.vehicule?.id) {
          this.vehiculeService.getById(o.vehicule.id).subscribe({
            next: (fullV) => {
              this.selectedVehicule = fullV;
              this.cdr.markForCheck();
            },
            error: () => {}
          });
        }

        this.loading = false;
        this.cdr.markForCheck();

        const urlClean = this.router.url.split('?')[0];
        const segments = urlClean.split('/');
        const lastSegment = segments[segments.length - 1];

        if (!this.hasAutoRedirected && (lastSegment === this.ordreId.toString() || lastSegment === 'reception')) {
          this.hasAutoRedirected = true;
          if (o.statut && o.statut !== 'A_FAIRE') {
            const targetPath = this.statutToPath(o.statut);
            if (targetPath !== lastSegment) {
              this.router.navigate(['/app/ordres-reparation', this.ordreId, targetPath], { replaceUrl: true });
            }
          } else {
            // Vérifie si un diagnostic a déjà été créé pour cet OR (même si le statut de l'ordre n'est pas encore synchro)
            this.diagnosticService.getByOrdreReparationId(this.ordreId).subscribe({
              next: (diag) => {
                if (diag) {
                  this.hasDiagnostic = true;
                  const targetPath = (diag.statut === 'VALIDE') ? 'pieces-mo' : 'diagnostic';
                  if (targetPath !== lastSegment) {
                    this.router.navigate(['/app/ordres-reparation', this.ordreId, targetPath], { replaceUrl: true });
                  }
                  this.cdr.markForCheck();
                }
              }
            });
          }
        } else {
          this.hasAutoRedirected = true;
          this.diagnosticService.getByOrdreReparationId(this.ordreId).subscribe({
            next: (diag) => {
              if (diag) {
                this.hasDiagnostic = true;
                this.cdr.markForCheck();
              }
            }
          });
        }
      },
      error: (err) => {
        console.error('Erreur chargement ordre', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updateCurrentStepFromUrl(): void {
    const url = this.router.url;
    const found = STEP_ROUTES.find(s => url.includes(`/${s.path}`));
    if (found) {
      this.currentStep = found.step;
    } else {
      this.currentStep = 1;
    }
    this.cdr.markForCheck();
  }

  statutToPath(s?: string | null): string {
    switch (s) {
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

  statutToStep(s?: string | null): number {
    switch (s) {
      case 'A_FAIRE': return 1;
      case 'EN_DIAGNOSTIC': return 2;
      case 'EN_ATTENTE_PIECES_MO': return 3;
      case 'EN_ATTENTE_PROFORMA': return 4;
      case 'PROFORMA_VALIDE': return 5;
      case 'EN_ATTENTE_COMMANDE': return 5;
      case 'EN_ATTENTE_SORTIE': return 6;
      case 'EN_ATTENTE_MECANICIEN': return 7;
      case 'EN_COURS': return 8;
      case 'EN_ATTENTE_PAIEMENT': return 9;
      case 'TERMINE': return 10;
      case 'LIVRE': return 11;
      default: return 1;
    }
  }

  get maxAllowedStep(): number {
    let s = this.loadedOrdre?.statut || 'A_FAIRE';
    if (s === 'A_FAIRE' && (this.hasDiagnostic || this.loadedOrdre?.diagnostic)) {
      s = 'EN_DIAGNOSTIC';
    }
    return Math.max(this.statutToStep(s), this.currentStep);
  }

  goToStep(n: number): void {
    const target = STEP_ROUTES.find(s => s.step === n);
    if (target) {
      this.router.navigate(['/app/ordres-reparation', this.ordreId, target.path]);
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  nextStep(): void {
    if (this.currentStep < 11) {
      this.goToStep(this.currentStep + 1);
    }
  }
}
