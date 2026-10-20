import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepPaiementResponseDto, StatutOrdreTravail, OrdreTravail } from '../../../models/ordre-travail.model';
import { FactureService } from '../../../../factures/facture.service';
import { FactureCreateRequest } from '../../../../factures/models/facture.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-step-paiement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-paiement.component.html'
})
export class StepPaiementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private factureService = inject(FactureService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  otId!: number;
  data: StepPaiementResponseDto | null = null;
  loadedOT: OrdreTravail | null = null;

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
      this.router.navigate(['/app/ordres-travail']);
      return;
    }
    this.otId = +idParam;
    this.loadData();
    this.loadOTSummary();
  }

  loadData(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.otService.getStepPaiement(this.otId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.data = res;
          this.loading = false;

          // Si aucune facture n'est attachée directement, vérification dans la liste globale des factures
          if (!this.hasFacture() && res.ordreReparationId) {
            this.searchExistingFacture(res.ordreReparationId);
          }

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

  loadOTSummary(): void {
    this.otService.getSummary(this.otId).subscribe({
      next: (ot) => {
        this.ngZone.run(() => {
          this.loadedOT = ot;
          this.cdr.detectChanges();
        });
      },
      error: () => {}
    });
  }

  searchExistingFacture(ordreReparationId: number): void {
    this.factureService.getAll().subscribe({
      next: (list: any) => {
        this.ngZone.run(() => {
          const items = Array.isArray(list) ? list : (list?.content || list?.data || []);
          const match = items.find((f: any) =>
            (f.ordreReparationId && Number(f.ordreReparationId) === Number(ordreReparationId)) ||
            (f.ordreReparation && Number(f.ordreReparation.id) === Number(ordreReparationId))
          );
          if (match && this.data) {
            this.data.hasFacture = true;
            this.data.facture = {
              id: match.id,
              numero: match.numero,
              client: match.clientNom || this.loadedOT?.clientNom,
              vehicule: match.immatriculation || this.loadedOT?.vehiculeImmatriculation,
              statut: match.statutPaiement || 'NON_PAYE',
              montantAPayer: match.montantTotal,
              montantPaye: match.montantPaye || 0,
              montantRestant: match.resteAPayer !== undefined ? match.resteAPayer : match.montantTotal,
              montantTotal: match.montantTotal,
              modePaiement: match.modePaiement || 'ESPECE'
            };
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {}
    });
  }

  hasFacture(): boolean {
    return !!(this.data?.hasFacture || this.data?.facture?.id);
  }

  isFacturePayee(): boolean {
    if (!this.data?.facture) return false;
    return this.data.facture.statut === 'PAYEE' || (this.data.facture.montantRestant || 0) <= 0;
  }

  // --- Modal Création Facture ---

  ouvrirModalCreationFacture(): void {
    this.showCreateFactureModal = true;
    this.remarqueFacture = `Facture pour Ordre de Travail ${this.data?.numero || ('#' + this.otId)}`;
    this.cdr.detectChanges();
  }

  fermerModalCreationFacture(): void {
    if (this.creatingFacture) return;
    this.showCreateFactureModal = false;
    this.cdr.detectChanges();
  }

  creerFacture(): void {
    if (!this.data) return;

    this.creatingFacture = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    const clientId = this.loadedOT?.client?.id || this.loadedOT?.vehicule?.client?.id || 0;
    const vehiculeId = this.data.vehiculeId || this.loadedOT?.vehicule?.id || 0;
    const ordreReparationId = this.data.ordreReparationId || this.loadedOT?.ordreReparationId || 0;

    const request: FactureCreateRequest = {
      clientId,
      vehiculeId,
      ordreReparationId,
      remarque: this.remarqueFacture.trim() || `Facture pour OT ${this.data.numero || ('#' + this.otId)}`,
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

          if (this.data) {
            this.data.hasFacture = true;
            this.data.facture = {
              id: res.id,
              numero: res.numero,
              client: res.clientNom || this.loadedOT?.clientNom,
              vehicule: res.immatriculation || this.loadedOT?.vehiculeImmatriculation,
              statut: res.statutPaiement || 'NON_PAYE',
              montantAPayer: res.montantTotal || res.montantTTC,
              montantPaye: res.montantPaye || 0,
              montantRestant: res.resteAPayer !== undefined ? res.resteAPayer : (res.montantTotal || res.montantTTC),
              montantTotal: res.montantTotal || res.montantTTC,
              modePaiement: res.modePaiement || this.modePaiement
            };
          }

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

  // --- Étape suivante ---

  continuerVersPretALivrer(): void {
    if (!this.hasFacture()) {
      this.errorMessage = 'Veuillez d\'abord créer la facture avant de passer à l\'étape suivante.';
      this.cdr.detectChanges();
      return;
    }

    this.advancing = true;
    this.cdr.detectChanges();

    if (this.data?.statut === StatutOrdreTravail.PAIEMENT) {
      this.otService.updateStatut(this.otId, StatutOrdreTravail.PRET_A_LIVRER).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.advancing = false;
            this.router.navigate(['/app/ordres-travail', this.otId, 'pret-a-livrer']);
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.advancing = false;
            this.router.navigate(['/app/ordres-travail', this.otId, 'pret-a-livrer']);
          });
        }
      });
    } else {
      this.advancing = false;
      this.router.navigate(['/app/ordres-travail', this.otId, 'pret-a-livrer']);
    }
  }
}
