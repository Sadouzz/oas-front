import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { StepPaiementResponseDto } from '../../../models/responses/step-paiement-response.dto';
import { FactureService } from '../../../../factures/facture.service';
import { FactureCreateRequest } from '../../../../factures/models/facture.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-step-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent, DecimalPipe],
  templateUrl: './step-paiement.component.html'
})
export class StepPaiementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private factureService = inject(FactureService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  ordreId!: number;
  data: StepPaiementResponseDto | null = null;

  loading = true;
  advancing = false;
  creatingFacture = false;
  paying = false;

  showCreateFactureModal = false;
  modePaiement = 'ESPECE';
  remarqueFacture = '';

  showPayModal = false;
  payMontant = 0;
  payMethode = 'ESPECE';

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
    this.cdr.detectChanges();

    this.ordreService.getStepPaiement(this.ordreId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.data = res;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          this.errorMessage = err.error?.message || 'Erreur lors du chargement de la facturation.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  hasFacture(): boolean {
    return !!(this.data?.facture?.id);
  }

  isFacturePayee(): boolean {
    if (!this.data?.facture) return false;
    const s = (this.data.facture.statut || '').toUpperCase();
    const restant = this.data.facture.montantRestant;
    return s === 'PAYE' && restant != null && Number.isFinite(restant) && restant <= 0;
  }

  // --- Modal Création Facture ---

  ouvrirModalCreationFacture(): void {
    this.showCreateFactureModal = true;
    this.remarqueFacture = `Facture pour Ordre de Réparation ${this.data?.numero || ('#' + this.ordreId)}`;
    this.cdr.detectChanges();
  }

  fermerModalCreationFacture(): void {
    if (this.creatingFacture) return;
    this.showCreateFactureModal = false;
    this.cdr.detectChanges();
  }

  creerFacture(): void {
    if (!this.data) return;
    if (!this.data.clientId || !this.data.vehiculeId) {
      this.errorMessage = 'Le client et le véhicule de cet ordre de réparation sont obligatoires pour créer la facture.';
      this.cdr.detectChanges();
      return;
    }

    this.creatingFacture = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    const request: FactureCreateRequest = {
      clientId: this.data.clientId,
      vehiculeId: this.data.vehiculeId,
      ordreReparationId: this.ordreId,
      remarque: this.remarqueFacture.trim() || `Facture pour OR ${this.data.numero || ('#' + this.ordreId)}`,
      modePaiement: this.modePaiement || 'ESPECE',
      pdfLayoutKey: 'AVEC_ENTETE'
    };

    this.factureService.create(request).subscribe({
      next: (res: any) => {
        this.ngZone.run(() => {
          this.creatingFacture = false;
          this.showCreateFactureModal = false;
          const ref = res?.numero || ('#' + res?.id);
          this.successMessage = `Facture ${ref} créée avec succès !`;
          this.loadData();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.creatingFacture = false;
          this.errorMessage = err.error?.message || err.message || 'Erreur lors de la création de la facture.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  // --- Modal Enregistrement Règlement ---

  ouvrirModalPaiement(): void {
    this.payMontant = this.data?.facture?.montantRestant || 0;
    this.payMethode = 'ESPECE';
    this.showPayModal = true;
    this.cdr.detectChanges();
  }

  fermerModalPaiement(): void {
    if (this.paying) return;
    this.showPayModal = false;
    this.cdr.detectChanges();
  }

  enregistrerPaiement(): void {
    if (!this.data?.facture?.id || this.payMontant <= 0) return;

    this.paying = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    this.factureService.payFacture(this.data.facture.id, this.payMontant, this.payMethode).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.paying = false;
          this.showPayModal = false;
          this.successMessage = 'Règlement enregistré avec succès !';
          this.loadData();
          this.cdr.detectChanges();
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.paying = false;
          this.errorMessage = err.error?.message || 'Erreur lors de l\'enregistrement du paiement.';
          this.cdr.detectChanges();
        });
      }
    });
  }

  validateStep(): void {
    this.continuerVersPretALivrer();
  }

  continuerVersPretALivrer(): void {
    this.advancing = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.ordreService.updateStatut(this.ordreId, 'PRET_A_LIVRER').subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'pret-a-livrer']);
        });
      },
      error: (err: any) => {
        this.ngZone.run(() => {
          this.advancing = false;
          this.errorMessage = err.error?.message || 'Impossible de passer à la livraison.';
          this.cdr.detectChanges();
        });
      }
    });
  }
}
