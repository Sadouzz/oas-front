import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { OrdreTravailService } from '../ordre-travail.service';
import {
  OrdreTravail,
  StatutOrdreTravail,
  ETAPES_ORDRE_TRAVAIL,
  EtapeOrdreTravailConfig,
  getEtapeFromStatutOT,
  getPathFromEtapeOT,
  getStatutColorOT
} from '../models/ordre-travail.model';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-ordre-travail-detail',
  standalone: true,
  imports: [CommonModule, NgClass, RouterLink, RouterOutlet, AlertComponent],
  templateUrl: './ordre-travail-detail.component.html'
})
export class OrdreTravailDetailComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);

  otId!: number;
  loadedOT: OrdreTravail | null = null;
  loading = true;
  errorMessage = '';

  currentStep = 1;
  maxAllowedStep = 1;
  statutSteps: EtapeOrdreTravailConfig[] = ETAPES_ORDRE_TRAVAIL;
  activeChild: any = null;

  private routerSub?: Subscription;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-travail']);
      return;
    }
    this.otId = +idParam;

    this.detectCurrentStepFromUrl();

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.detectCurrentStepFromUrl();
        this.loadOTSilently();
      });

    this.loadOT();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  onActivate(componentRef: any): void {
    this.activeChild = componentRef;
    this.cdr.markForCheck();
  }

  detectCurrentStepFromUrl(): void {
    const url = this.router.url;
    for (const s of this.statutSteps) {
      if (url.includes(`/ordres-travail/${this.otId}/${s.path}`)) {
        this.currentStep = s.etape;
        break;
      }
    }
    this.cdr.markForCheck();
  }

  loadOTSilently(): void {
    if (!this.otId) return;
    this.otService.getSummary(this.otId).subscribe({
      next: (ot) => {
        this.loadedOT = ot;
        const etapeFromStatut = getEtapeFromStatutOT(ot.statut);
        this.maxAllowedStep = Math.max(etapeFromStatut, ot.etape || 1);
        this.cdr.markForCheck();
      }
    });
  }

  loadOT(): void {
    this.loading = true;
    this.otService.getSummary(this.otId).subscribe({
      next: (ot) => {
        this.loadedOT = ot;
        const etapeFromStatut = getEtapeFromStatutOT(ot.statut);
        this.maxAllowedStep = Math.max(etapeFromStatut, ot.etape || 1);

        // Si on est sur la racine /ordres-travail/:id sans sous-chemin, rediriger vers l'étape active
        const urlSegments = this.router.url.split('/');
        const lastSegment = urlSegments[urlSegments.length - 1];
        if (lastSegment === this.otId.toString()) {
          const targetPath = getPathFromEtapeOT(this.maxAllowedStep);
          this.router.navigate(['/app/ordres-travail', this.otId, targetPath], { replaceUrl: true });
        }

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

  goToStep(stepNumber: number): void {
    if (stepNumber > this.maxAllowedStep) {
      return;
    }
    const stepConfig = this.statutSteps.find(s => s.etape === stepNumber);
    if (stepConfig) {
      this.currentStep = stepNumber;
      this.router.navigate(['/app/ordres-travail', this.otId, stepConfig.path]);
    }
  }

  getStatutBadgeClass(statut: string | undefined): string {
    const c = getStatutColorOT(statut);
    return `${c.bg} ${c.text} ${c.border}`;
  }

  getClientDisplay(): string {
    if (!this.loadedOT) return '';

    if (this.loadedOT.clientNom && this.loadedOT.clientNom !== 'undefined undefined') {
      return this.loadedOT.clientNom;
    }

    const c: any = this.loadedOT.client ||
      this.loadedOT.vehicule?.client ||
      this.activeChild?.data?.client;

    if (!c) return '';
    if (typeof c === 'string') return c !== 'undefined undefined' ? c : '';
    if (c.clientNom && c.clientNom !== 'undefined undefined') return c.clientNom;
    if (c.fullName && c.fullName !== 'undefined undefined') return c.fullName;
    if (c.name && c.name !== 'undefined undefined') return c.name;

    const prenom = (c.firstName || c.prenom || '').toString().trim();
    const nom = (c.lastName || c.nom || '').toString().trim();
    const fullName = `${prenom} ${nom}`.trim();

    if (fullName && fullName !== 'undefined undefined' && fullName !== 'undefined') {
      return fullName;
    }

    return c.phone || c.telephone || c.email || '';
  }

  getClientPhone(): string {
    if (!this.loadedOT) return '';
    const c: any = this.loadedOT.client ||
      this.loadedOT.vehicule?.client ||
      this.activeChild?.data?.client;
    return c?.phone || c?.telephone || (this.loadedOT as any).clientPhone || '';
  }
}

