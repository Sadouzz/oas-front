import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { OrdreReparationService } from '../ordre-reparation.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { OrdreReparation, StatutOrdre, VehiculeModel, STATUT_ETAPES, getEtapeFromStatut } from '../../../shared/models';

export const STEP_ROUTES: { step: number; path: string; statut: StatutOrdre; label: string }[] = [
  { step: 1, path: 'reception', statut: 'RECEPTION', label: 'Réception' },
  { step: 2, path: 'diagnostic', statut: 'DIAGNOSTIC', label: 'Chef Atelier' },
  { step: 3, path: 'pieces-mo', statut: 'PIECES_MO', label: 'OR' },
  { step: 4, path: 'proforma', statut: 'PROFORMA', label: 'Proforma' },
  { step: 5, path: 'ordre-travail', statut: 'ORDRE_DE_TRAVAIL', label: 'Ordre de Travail' },
  { step: 6, path: 'bl', statut: 'BL', label: 'BL' },
  { step: 7, path: 'pret-a-livrer', statut: 'PRET_A_LIVRER', label: 'Prêt' },
  { step: 8, path: 'livraison', statut: 'LIVRE', label: 'Livré' },
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
  private routerSub?: Subscription;

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;
  selectedVehicule: VehiculeModel | null = null;
  loading = true;
  pollInterval: any;
  hasDiagnostic = false;

  currentStep = 1;
  statutSteps = STEP_ROUTES;
  activeChild: any = null;

  get isLockedByOt(): boolean {
    return this.maxAllowedStep >= 5 || !!this.activeChild?.isReadOnly;
  }

  onActivate(componentRef: any): void {
    this.activeChild = componentRef;
    if (typeof componentRef?.saveStep2ThenGoNext === 'function') {
      componentRef.onStepCompleted = () => {
        if (this.loadedOrdre) this.loadedOrdre.statut = 'PIECES_MO';
        this.cdr.markForCheck();
      };
    }
    this.cdr.markForCheck();
  }

  isNextStepDisabled(): boolean {
    if (this.activeChild?.saving || this.activeChild?.loading || this.activeChild?.technicienToggling != null) return true;
    if (this.currentStep === 2) {
      const techniciens = this.activeChild?.selectedTechniciens
        ?? this.loadedOrdre?.diagnostic?.technicienIds
        ?? (this.loadedOrdre?.diagnostic?.technicienId ? [this.loadedOrdre.diagnostic.technicienId] : []);
      return !techniciens.length;
    }
    if (this.currentStep === 3) {
      if (this.activeChild) {
        return !this.activeChild.hasAtLeastOneItem;
      }
      return !(this.loadedOrdre?.hasPiecesMo);
    }
    if (this.currentStep === 4) {
      return !this.activeChild?.isProformaValide;
    }
    if (this.currentStep === 5) {
      if (this.activeChild) {
        return !this.activeChild.isOtTermine;
      }
      return true;
    }
    return false;
  }

  validerEtapeCourante(): void {
    if (this.isLockedByOt && this.currentStep <= 3) {
      this.nextStep();
      return;
    }
    if (this.currentStep === 2) {
      const techniciens = this.activeChild?.selectedTechniciens
        ?? this.loadedOrdre?.diagnostic?.technicienIds
        ?? (this.loadedOrdre?.diagnostic?.technicienId ? [this.loadedOrdre.diagnostic.technicienId] : []);
      if (!techniciens.length) {
        return;
      }
      if (this.activeChild && typeof this.activeChild.saveStep2ThenGoNext === 'function') {
        this.activeChild.saveStep2ThenGoNext();
      }
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
    if (this.currentStep === 4) {
      if (!this.activeChild?.isProformaValide) {
        return;
      }
      if (this.activeChild && typeof this.activeChild.passerEtapeSuivante === 'function') {
        this.activeChild.passerEtapeSuivante();
        return;
      }
    }
    if (this.currentStep === 5) {
      if (this.activeChild && !this.activeChild.isOtTermine) {
        this.activeChild.errorMessage = "L'Ordre de Travail doit être au statut TERMINE pour pouvoir passer au BL.";
        this.activeChild.cdr?.markForCheck();
        return;
      }
      if (this.activeChild && typeof this.activeChild.passerAuPaiement === 'function') {
        this.activeChild.passerAuPaiement();
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
    if (this.isLockedByOt && this.currentStep <= 3) {
      switch (this.currentStep) {
        case 1:
          return 'Étape suivante (Chef Atelier)';
        case 2:
          return 'Étape suivante (OR)';
        case 3:
          return 'Étape suivante (Proforma)';
      }
    }
    switch (this.currentStep) {
      case 1:
        return 'Valider la réception';
      case 2:
        return 'Passer à l’OR';
      case 3:
        return 'Valider l’OR';
      case 4:
        return 'Passer à l\'Ordre de Travail';
      case 5:
        return 'Passer au BL';
      case 6:
        return 'Valider le BL';
      case 7:
        return 'Marquer prêt pour livraison';
      case 8:
        return 'Clôturer la livraison';
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

    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateCurrentStepFromUrl();
      this.loadOrdreSilently();
    });

    //recupere les details chaque 8 secondes
    //this.startPolling();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
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
    const url = this.router.url;
    if (!url.includes(`/ordres-reparation/${this.ordreId}`)) return;
    this.service.getSummary(this.ordreId).subscribe({
      next: (res: any) => {
        const o = res?.data || res;
        this.loadedOrdre = o;
        this.selectedVehicule = o?.vehicule as any;
        this.hasDiagnostic = !!o?.hasDiagnostic;
        this.cdr.markForCheck();
        const lastSegment = this.router.url.split('?')[0].split('/').pop() || '';
        if (this.statutToStep(o?.statut) >= 5 && ['reception', 'diagnostic', 'pieces-mo'].includes(lastSegment)) {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'proforma'], { replaceUrl: true });
        } else if (this.statutToStep(o?.statut) >= 3 && lastSegment === 'diagnostic') {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, this.statutToPath(o?.statut)], { replaceUrl: true });
        }
      }
    });
  }

  private hasAutoRedirected = false;

  loadOrdre(): void {
    this.loading = true;
    this.service.getSummary(this.ordreId).subscribe({
      next: (res: any) => {
        const o = res?.data || res;
        this.loadedOrdre = o;
        this.selectedVehicule = o?.vehicule as any;
        this.hasDiagnostic = !!o?.hasDiagnostic;
        this.loading = false;
        this.cdr.markForCheck();

        const urlClean = this.router.url.split('?')[0];
        const segments = urlClean.split('/');
        const lastSegment = segments[segments.length - 1];

        if (this.statutToStep(o?.statut) >= 5 && ['reception', 'diagnostic', 'pieces-mo'].includes(lastSegment)) {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'proforma'], { replaceUrl: true });
          return;
        }
        if (this.statutToStep(o?.statut) >= 3 && lastSegment === 'diagnostic') {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, this.statutToPath(o?.statut)], { replaceUrl: true });
          return;
        }

        if (!this.hasAutoRedirected && (lastSegment === this.ordreId.toString() || lastSegment === 'reception')) {
          this.hasAutoRedirected = true;
          if (lastSegment === this.ordreId.toString() || lastSegment === 'reception') {
            if (o?.statut && o.statut !== 'RECEPTION' && o.statut !== 'A_FAIRE') {
              const targetPath = this.statutToPath(o.statut);
              if (targetPath !== lastSegment) {
                this.router.navigate(['/app/ordres-reparation', this.ordreId, targetPath], { replaceUrl: true });
              }
            } else if (o?.hasDiagnostic) {
              this.router.navigate(['/app/ordres-reparation', this.ordreId, 'diagnostic'], { replaceUrl: true });
            }
          }
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
      case 'RECEPTION':
      case 'A_FAIRE': return 'reception';
      case 'DIAGNOSTIC':
      case 'EN_DIAGNOSTIC': return 'diagnostic';
      case 'PIECES_MO':
      case 'EN_ATTENTE_PIECES_MO': return 'pieces-mo';
      case 'PROFORMA':
      case 'EN_ATTENTE_PROFORMA': return 'proforma';
      case 'ORDRE_DE_TRAVAIL':
      case 'BON_DE_COMMANDE':
      case 'PROFORMA_VALIDE':
      case 'EN_ATTENTE_COMMANDE':
      case 'BON_DE_SORTIE':
      case 'EN_ATTENTE_SORTIE':
      case 'ASSIGN_TECHNICIEN':
      case 'EN_ATTENTE_MECANICIEN':
      case 'REPARATION':
      case 'EN_COURS': return 'ordre-travail';
      case 'BL':
      case 'EN_ATTENTE_BL':
      case 'PAIEMENT':
      case 'EN_ATTENTE_PAIEMENT': return 'bl';
      case 'PRET_A_LIVRER': return 'pret-a-livrer';
      case 'LIVRE':
      case 'TERMINE': return 'livraison';
      default: return 'reception';
    }
  }

  statutToStep(s?: string | null): number {
    return getEtapeFromStatut(s);
  }

  get maxAllowedStep(): number {
    let s = this.loadedOrdre?.statut || 'RECEPTION';
    if ((s === 'RECEPTION' || s === 'A_FAIRE') && (this.hasDiagnostic || this.loadedOrdre?.diagnostic)) {
      s = 'DIAGNOSTIC';
    }
    return this.statutToStep(s);
  }

  goToStep(n: number): void {
    const statutEtape = this.statutToStep(this.loadedOrdre?.statut);
    // Dès le passage à l'Ordre de Travail, seules les étapes Proforma et suivantes restent accessibles.
    if (statutEtape >= 5 && n < 4) {
      this.router.navigate(['/app/ordres-reparation', this.ordreId, 'proforma']);
      return;
    }
    if (statutEtape >= 3 && n <= 2) {
      this.router.navigate(['/app/ordres-reparation', this.ordreId, this.statutToPath(this.loadedOrdre?.statut)]);
      return;
    }
    if (n > this.maxAllowedStep) return;
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
    if (this.currentStep < 8) {
      this.goToStep(this.currentStep + 1);
    }
  }
}
