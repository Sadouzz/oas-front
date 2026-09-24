import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { ProformaService } from '../../../../proforma/proforma.service';
import { PieceDetacheeService } from '../../../../pieces-detachees/piece-detachee.service';
import { MainDoeuvreService } from '../../../../main-doeuvre/main-doeuvre.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import {
  OrdreReparation,
  ProformaRequest,
  PieceDetache,
  MainDoeuvreModel,
  extractContent
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
  private pieceService = inject(PieceDetacheeService);
  private moService = inject(MainDoeuvreService);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;
  proformaChargee: any = null;
  allPieces: PieceDetache[] = [];
  allMO: MainDoeuvreModel[] = [];

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
    forkJoin({
      ordre: this.ordreService.getById(this.ordreId),
      pieces: this.pieceService.getAll(),
      mo: this.moService.getAll()
    }).subscribe({
      next: ({ ordre, pieces, mo }) => {
        this.loadedOrdre = ordre;
        this.allPieces = extractContent<PieceDetache>(pieces as any);
        this.allMO = extractContent<MainDoeuvreModel>(mo as any);
        this.chargerProforma();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement des données.';
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
      lignesPieces: (this.loadedOrdre.lignesOrdreReparationPieces || []).map((l: any) => {
        const pieceId = l.isCustom ? null : (l.piece?.id || (l as any).pieceId || null);
        const catPiece = pieceId ? this.allPieces.find(p => p.id === pieceId) : null;
        let finalPrice = 0;
        if (l.prix != null && Number(l.prix) > 0) {
          finalPrice = Number(l.prix);
        } else if (catPiece?.prix != null && Number(catPiece.prix) > 0) {
          finalPrice = Number(catPiece.prix);
        } else if (l.piece?.prix != null && Number(l.piece.prix) > 0) {
          finalPrice = Number(l.piece.prix);
        }

        return {
          pieceId,
          isCustom: !!l.isCustom,
          custom: !!l.isCustom,
          designationPds: l.designationPds,
          quantite: Number(l.quantite),
          prix: finalPrice
        };
      }),
      lignesMainDoeuvres: (this.loadedOrdre.lignesOrdreReparationMainDoeuvres || []).map((l: any) => {
        const moId = Number(l.mainDoeuvre?.id || (l as any).mainDoeuvreId);
        const catMO = this.allMO.find(m => m.id === moId);
        let finalPrice = 0;
        if (l.prix != null && Number(l.prix) > 0) {
          finalPrice = Number(l.prix);
        } else if (catMO?.prix != null && Number(catMO.prix) > 0) {
          finalPrice = Number(catMO.prix);
        } else if (l.mainDoeuvre?.prix != null && Number(l.mainDoeuvre.prix) > 0) {
          finalPrice = Number(l.mainDoeuvre.prix);
        }

        return {
          mainDoeuvreId: moId,
          nbreHeure: Number(l.nbreHeure),
          tarifHoraire: finalPrice
        };
      })
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

  get lignesPiecesAffichees(): any[] {
    if (this.proformaChargee?.lignesPieces && this.proformaChargee.lignesPieces.length > 0) {
      return this.proformaChargee.lignesPieces;
    }
    if (this.proformaChargee?.lignesPiece && this.proformaChargee.lignesPiece.length > 0) {
      return this.proformaChargee.lignesPiece;
    }
    return this.loadedOrdre?.lignesOrdreReparationPieces || [];
  }

  get lignesMainDoeuvreAffichees(): any[] {
    if (this.proformaChargee?.lignesMainDoeuvres && this.proformaChargee.lignesMainDoeuvres.length > 0) {
      return this.proformaChargee.lignesMainDoeuvres;
    }
    if (this.proformaChargee?.lignesMainDoeuvre && this.proformaChargee.lignesMainDoeuvre.length > 0) {
      return this.proformaChargee.lignesMainDoeuvre;
    }
    return this.loadedOrdre?.lignesOrdreReparationMainDoeuvres || [];
  }

  get hasArticles(): boolean {
    return this.lignesPiecesAffichees.length > 0 || this.lignesMainDoeuvreAffichees.length > 0;
  }

  getPieceDesignation(ligne: any): string {
    return ligne?.designationPiece || ligne?.designationPds || ligne?.piece?.designation || ligne?.piece?.reference || 'Pièce';
  }

  getPieceReference(ligne: any): string {
    return ligne?.piece?.reference || '';
  }

  getPieceType(ligne: any): string {
    if (ligne?.isCustom || ligne?.designationPds) return 'PDS';
    return ligne?.piece?.type || 'CAT';
  }

  getPieceQuantite(ligne: any): number {
    return Number(ligne?.quantite) || 0;
  }

  getPiecePrixUnitaire(ligne: any): number {
    if (ligne?.prix != null && Number(ligne.prix) > 0) return Number(ligne.prix);
    if (ligne?.prixUnitaire != null && Number(ligne.prixUnitaire) > 0) return Number(ligne.prixUnitaire);
    const pieceId = ligne?.piece?.id ?? (ligne as any)?.pieceId;
    if (pieceId) {
      const cat = this.allPieces.find(p => p.id === pieceId);
      if (cat?.prix != null && Number(cat.prix) > 0) return Number(cat.prix);
    }
    if (ligne?.piece?.prix != null && Number(ligne.piece.prix) > 0) return Number(ligne.piece.prix);
    return 0;
  }

  getPieceTotal(ligne: any): number {
    if (ligne?.montantTotal != null && Number(ligne.montantTotal) > 0) return Number(ligne.montantTotal);
    if (ligne?.total != null && Number(ligne.total) > 0) return Number(ligne.total);
    return this.getPiecePrixUnitaire(ligne) * this.getPieceQuantite(ligne);
  }

  getMODescription(ligne: any): string {
    return ligne?.descriptionMainDoeuvre || ligne?.description || ligne?.mainDoeuvre?.description || ligne?.mainDoeuvre?.categorie?.nom || 'Prestation main-d’œuvre';
  }

  getMOCategorie(ligne: any): string {
    return ligne?.mainDoeuvre?.categorie?.nom || '';
  }

  getMOHeures(ligne: any): number {
    return Number(ligne?.nbreHeure ?? ligne?.heures ?? ligne?.quantite ?? 0);
  }

  getMOTarifHoraire(ligne: any): number {
    if (ligne?.tarifHoraire != null && Number(ligne.tarifHoraire) > 0) return Number(ligne.tarifHoraire);
    if (ligne?.prix != null && Number(ligne.prix) > 0) return Number(ligne.prix);
    if (ligne?.prixUnitaire != null && Number(ligne.prixUnitaire) > 0) return Number(ligne.prixUnitaire);
    const moId = ligne?.mainDoeuvre?.id ?? (ligne as any)?.mainDoeuvreId;
    if (moId) {
      const cat = this.allMO.find(m => m.id === moId);
      if (cat?.prix != null && Number(cat.prix) > 0) return Number(cat.prix);
    }
    if (ligne?.mainDoeuvre?.prix != null && Number(ligne.mainDoeuvre.prix) > 0) return Number(ligne.mainDoeuvre.prix);
    return 0;
  }

  getMOTotal(ligne: any): number {
    if (ligne?.montantTotal != null && ligne?.montantTotal !== 0) return Number(ligne.montantTotal);
    if (ligne?.total != null && ligne?.total !== 0) return Number(ligne.total);
    return this.getMOTarifHoraire(ligne) * this.getMOHeures(ligne);
  }

  get totalPiecesEstime(): number {
    return this.lignesPiecesAffichees.reduce((acc, l) => acc + this.getPieceTotal(l), 0);
  }

  get totalMOEstime(): number {
    return this.lignesMainDoeuvreAffichees.reduce((acc, l) => acc + this.getMOTotal(l), 0);
  }

  get totalHTCalcule(): number {
    if (this.proformaChargee?.montantHT != null && this.proformaChargee.montantHT > 0) {
      return this.proformaChargee.montantHT;
    }
    return this.totalPiecesEstime + this.totalMOEstime;
  }

  get tvaTaux(): number {
    return this.proformaChargee?.tva ?? 18;
  }

  get totalTVACalcule(): number {
    if (this.proformaChargee?.montantTVA != null && this.proformaChargee.montantTVA > 0) {
      return this.proformaChargee.montantTVA;
    }
    return Math.round(this.totalHTCalcule * (this.tvaTaux / 100));
  }

  get totalTTCCalcule(): number {
    if (this.proformaChargee?.montantTTC != null && this.proformaChargee.montantTTC > 0) {
      return this.proformaChargee.montantTTC;
    }
    return this.totalHTCalcule + this.totalTVACalcule;
  }

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
