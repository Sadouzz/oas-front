import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { ProformaService } from '../../../../proforma/proforma.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import {
  OrdreReparation,
  ProformaRequest
} from '../../../../../shared/models';

@Component({
  selector: 'app-step-proforma',
  standalone: true,
  imports: [CommonModule, AlertComponent],
  templateUrl: './step-proforma.component.html'
})
export class StepProformaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private proformaService = inject(ProformaService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;
  proformaChargee: any = null;

  loading = true;
  saving = false;
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
    this.ordreService.getById(this.ordreId).subscribe({
      next: (o: OrdreReparation) => {
        this.loadedOrdre = o;
        this.chargerProforma();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de l\'ordre.';
        this.cdr.markForCheck();
      }
    });
  }

  chargerProforma(): void {
    this.proformaService.getByOrdreReparationId(this.ordreId).subscribe({
      next: (p) => {
        this.proformaChargee = p;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.proformaChargee = null;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  genererProforma(): void {
    if (!this.loadedOrdre) return;
    this.saving = true;

    const vehicule = this.loadedOrdre.vehicule;
    const client = vehicule?.client;
    const clientId = client?.id || (vehicule as any)?.clientId || (this.loadedOrdre as any)?.clientId || 0;
    const kilometrage = vehicule?.kilometrage ?? (this.loadedOrdre?.diagnostic?.kilometrage ?? 0);

    if (!clientId) {
      this.saving = false;
      this.errorMessage = 'Impossible de générer le proforma : aucun client associé au véhicule.';
      this.cdr.markForCheck();
      return;
    }

    const payload: ProformaRequest = {
      clientId,
      ordreReparationId: this.ordreId,
      vehiculeId: vehicule?.id || null,
      kilometrage: Number(kilometrage) || 0,
      immatriculation: vehicule?.immatriculation || '',
      numeroChassis: (vehicule as any)?.numeroChassis || '',
      marque: vehicule?.marque || '',
      modele: vehicule?.modele || '',
      annee: (vehicule as any)?.annee || null,
      tvaRate: 18,
      montantTimbre: 0,
      montantAutre: 0,
      lignesPieces: (this.loadedOrdre.lignesOrdreReparationPieces || []).map((l: any) => ({
        pieceId: l.isCustom ? null : (l.piece?.id || null),
        isCustom: !!l.isCustom,
        custom: !!l.isCustom,
        designationPds: l.designationPds,
        quantite: Number(l.quantite),
        prix: Number(l.isCustom ? (l.prix || 0) : (l.piece?.prix || 0))
      })),
      lignesMainDoeuvres: (this.loadedOrdre.lignesOrdreReparationMainDoeuvres || []).map((l: any) => ({
        mainDoeuvreId: Number(l.mainDoeuvre?.id),
        nbreHeure: Number(l.nbreHeure),
        tarifHoraire: Number(l.mainDoeuvre?.prix || 0)
      }))
    };

    this.proformaService.create(payload).subscribe({
      next: (p) => {
        this.saving = false;
        this.proformaChargee = p;
        this.successMessage = 'Proforma générée avec succès.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la génération de la proforma.';
        this.cdr.markForCheck();
      }
    });
  }

  telechargementEnCours = false;

  get isProformaValide(): boolean {
    if (!this.proformaChargee) return false;
    const s = (this.proformaChargee.statut || '').toUpperCase();
    const isProformaStatusValide = ['ACCEPTE', 'ACCEPTEE', 'VALIDE', 'VALIDEE', 'VALIDEE_CLIENT', 'APPROUVE', 'APPROUVEE'].includes(s);
    const isOrdrePastProforma = !!(this.loadedOrdre?.statut && !['RECEPTION', 'A_FAIRE', 'DIAGNOSTIC', 'EN_DIAGNOSTIC', 'PIECES_MO', 'EN_ATTENTE_PIECES_MO', 'PROFORMA', 'EN_ATTENTE_PROFORMA'].includes(this.loadedOrdre.statut));
    return isProformaStatusValide || isOrdrePastProforma;
  }

  validerProforma(): void {
    if (!this.proformaChargee?.id) {
      this.errorMessage = 'Aucune proforma chargée à valider.';
      this.cdr.markForCheck();
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.proformaService.valider(this.proformaChargee.id).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (this.proformaChargee) {
          this.proformaChargee.statut = res?.statut || 'ACCEPTE';
        }
        this.successMessage = 'Devis proforma validé avec succès.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la validation du proforma.';
        this.cdr.markForCheck();
      }
    });
  }

  passerEtapeSuivante(): void {
    if (!this.isProformaValide) {
      this.errorMessage = 'Veuillez d\'abord valider le devis proforma pour continuer.';
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    const hasRupture = (this.loadedOrdre?.lignesOrdreReparationPieces || []).some((l: any) => {
      if (l.isCustom) return false;
      const dispo = (l.piece?.stockMagasin ?? 0) + (l.piece?.stockAtelier ?? 0);
      return (l.quantite ?? 0) > dispo;
    });

    const nextStatut = hasRupture ? 'BON_DE_COMMANDE' : 'BON_DE_SORTIE';
    this.ordreService.updateStatut(this.ordreId, nextStatut).subscribe({
      next: () => {
        this.saving = false;
        this.cdr.markForCheck();

        if (hasRupture) {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'approvisionnement']);
        } else {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
        }
      },
      error: (err) => {
        this.saving = false;
        // Si le statut est déjà synchronisé côté backend, on autorise la navigation
        if (hasRupture) {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'approvisionnement']);
        } else {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'bon-sortie']);
        }
      }
    });
  }

  validateStep(): void {
    this.passerEtapeSuivante();
  }

  telechargerPdf(): void {
    if (!this.proformaChargee?.id) return;
    this.telechargementEnCours = true;
    this.proformaService.downloadPdf(this.proformaChargee.id).subscribe({
      next: (blob) => {
        this.telechargementEnCours = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proforma-${this.proformaChargee.numero || this.proformaChargee.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.cdr.markForCheck();
      },
      error: () => {
        this.telechargementEnCours = false;
        this.errorMessage = 'Impossible de télécharger le PDF du proforma.';
        this.cdr.markForCheck();
      }
    });
  }
}
