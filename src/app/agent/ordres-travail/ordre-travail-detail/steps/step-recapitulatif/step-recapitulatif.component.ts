import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepRecapitulatifResponseDto, StatutOrdreTravail, PieceApprovisionnementDto } from '../../../models/ordre-travail.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-step-recapitulatif',
  standalone: true,
  imports: [CommonModule, AlertComponent],
  templateUrl: './step-recapitulatif.component.html'
})
export class StepRecapitulatifComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private cdr = inject(ChangeDetectorRef);

  otId!: number;
  data: StepRecapitulatifResponseDto | null = null;
  loading = true;
  advancing = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-travail']);
      return;
    }
    this.otId = +idParam;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.otService.getStepRecapitulatif(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement du récapitulatif.';
        this.cdr.markForCheck();
      }
    });
  }

  continuerVersApprovisionnement(): void {
    this.advancing = true;
    // Si l'OT est encore à l'étape RECAPITULATIF, on avance son statut vers BON_DE_COMMANDE
    if (this.data?.statut === StatutOrdreTravail.RECAPITULATIF) {
      this.otService.updateStatut(this.otId, StatutOrdreTravail.BON_DE_COMMANDE).subscribe({
        next: () => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-travail', this.otId, 'approvisionnement']);
        },
        error: () => {
          // Si le changement de statut échoue côté backend pour une raison ou s'il est déjà passé, on navigue quand même
          this.advancing = false;
          this.router.navigate(['/app/ordres-travail', this.otId, 'approvisionnement']);
        }
      });
    } else {
      this.advancing = false;
      this.router.navigate(['/app/ordres-travail', this.otId, 'approvisionnement']);
    }
  }

  getClientNom(): string {
    if (!this.data) return 'Non renseigné';
    const c: any = this.data.client || (this.data as any).clientNom;
    if (!c) return (this.data as any).clientNom || 'Non renseigné';
    if (typeof c === 'string') return c !== 'undefined undefined' ? c : 'Non renseigné';
    if (c.clientNom && c.clientNom !== 'undefined undefined') return c.clientNom;
    if (c.fullName && c.fullName !== 'undefined undefined') return c.fullName;
    if (c.name && c.name !== 'undefined undefined') return c.name;

    const fn = (c.firstName || c.prenom || '').toString().trim();
    const ln = (c.lastName || c.nom || '').toString().trim();
    const full = `${fn} ${ln}`.trim();
    if (full && full !== 'undefined undefined' && full !== 'undefined') return full;

    return (this.data as any).clientNom || c.phone || c.email || 'Non renseigné';
  }

  getClientPhone(): string {
    if (!this.data) return 'Non renseigné';
    const c: any = this.data.client;
    return c?.phone || c?.telephone || (this.data as any).clientPhone || 'Non renseigné';
  }

  get piecesManquantes(): PieceApprovisionnementDto[] {
    return (this.data?.piecesManquantesProforma || []).filter(
      p => (p.quantiteManquante && p.quantiteManquante > 0) || p.isManquant
    );
  }

  get hasPiecesManquantes(): boolean {
    return this.piecesManquantes.length > 0;
  }

  get totalPiecesManquantes(): number {
    return this.piecesManquantes.reduce((sum, p) => sum + (p.quantiteManquante || 0), 0);
  }

  get totalMontantManquant(): number {
    return this.piecesManquantes.reduce(
      (sum, p) => sum + ((p.prixUnitaire || 0) * (p.quantiteManquante || 0)),
      0
    );
  }

  getPieceManquante(ligneId?: number): PieceApprovisionnementDto | undefined {
    if (!ligneId) return undefined;
    return this.piecesManquantes.find(p => p.ligneId === ligneId);
  }

  get lignesMainDoeuvreList(): any[] {
    return this.data?.proforma?.lignesMainDoeuvre || (this.data?.proforma as any)?.lignesMainDoeuvres || [];
  }
}
