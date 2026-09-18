import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { PieceDetacheeService } from '../../../../pieces-detachees/piece-detachee.service';
import { MainDoeuvreService } from '../../../../main-doeuvre/main-doeuvre.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { SearchableSelectComponent } from '../../../../../shared/components/searchable-select/searchable-select.component';
import {
  OrdreReparation,
  PieceDetache,
  MainDoeuvreModel,
  StatutOrdre,
  extractContent
} from '../../../../../shared/models';

export interface LignePiece {
  isCustom?: boolean;
  piece?: PieceDetache;
  pieceIdTemp?: number;
  designationPds?: string;
  prixUnitaire?: number;
  quantite: number;
  stockDisponible?: number;
  manquant: number;
  aSortirMagasin?: number;
  stockAtelier?: number;
}

export interface LigneMO {
  mo: MainDoeuvreModel;
  quantite: number;
}

@Component({
  selector: 'app-step-pieces-mo',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, SearchableSelectComponent],
  templateUrl: './step-pieces-mo.component.html'
})
export class StepPiecesMoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private pieceService = inject(PieceDetacheeService);
  private moService = inject(MainDoeuvreService);
  cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  allPieces: PieceDetache[] = [];
  allMO: MainDoeuvreModel[] = [];

  lignesPieces: LignePiece[] = [];
  lignesMO: LigneMO[] = [];

  pieceAjouter: number | null = null;
  qteAjouter = 1;
  moAjouter: number | null = null;
  qteAjouterMO = 1;

  pieceCustomDesignation = '';
  pieceCustomPrix: number | null = null;
  pieceCustomQuantite = 1;

  pieceSearch = '';
  moSearch = '';

  get piecesFiltrees(): PieceDetache[] {
    const q = this.pieceSearch.toLowerCase();
    if (!q) return this.allPieces.slice(0, 30);
    return this.allPieces.filter(p =>
      p.reference.toLowerCase().includes(q) ||
      (p.designation || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }

  get moFiltrees(): MainDoeuvreModel[] {
    const q = this.moSearch.toLowerCase();
    if (!q) return this.allMO.slice(0, 30);
    return this.allMO.filter(m =>
      (m.description || '').toLowerCase().includes(q) ||
      (m.categorie?.nom || '').toLowerCase().includes(q)
    ).slice(0, 30);
  }

  get totalPieces(): number {
    return this.lignesPieces.reduce((sum, l) => {
      const price = l.isCustom ? (l.prixUnitaire ?? 0) : (l.piece?.prix ?? 0);
      return sum + price * l.quantite;
    }, 0);
  }

  get totalMO(): number {
    return this.lignesMO.reduce((sum, l) => sum + (l.mo?.prix ?? 0) * l.quantite, 0);
  }

  get totalGeneral(): number {
    return this.totalPieces + this.totalMO;
  }

  get hasRuptureStock(): boolean {
    return this.lignesPieces.some(l => !l.isCustom && l.manquant > 0);
  }

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
      pieces: this.pieceService.getAll(),
      mo: this.moService.getAll(),
      ordre: this.ordreService.getById(this.ordreId)
    }).subscribe({
      next: ({ pieces, mo, ordre }) => {
        this.allPieces = extractContent<PieceDetache>(pieces as any).filter(p => p.statut === 'ACTIF');
        this.allMO = extractContent<MainDoeuvreModel>(mo as any).filter(m => !m.isArchived);
        this.loadedOrdre = ordre;

        this.lignesPieces = (ordre.lignesOrdreReparationPieces || []).map((l: any) => ({
          piece: l.piece,
          pieceIdTemp: l.piece?.id,
          quantite: l.quantite,
          isCustom: l.isCustom,
          designationPds: l.designationPds,
          prixUnitaire: l.prix,
          stockDisponible: l.isCustom ? 0 : (l.piece?.stockMagasin ?? 0) + (l.piece?.stockAtelier ?? 0),
          manquant: l.isCustom ? 0 : Math.max(0, l.quantite - (l.piece?.stockAtelier ?? 0)),
          aSortirMagasin: l.isCustom ? 0 : (Math.max(0, l.quantite - (l.piece?.stockAtelier ?? 0)) > 0 ? 0 : 1)
        }));

        this.lignesMO = (ordre.lignesOrdreReparationMainDoeuvres || []).map((l: any) => ({
          mo: l.mainDoeuvre,
          quantite: l.nbreHeure,
        }));

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Impossible de charger les données.';
        this.cdr.markForCheck();
      }
    });
  }

  addPiece(): void {
    if (!this.pieceAjouter || this.qteAjouter <= 0) return;
    const p = this.allPieces.find(item => item.id === Number(this.pieceAjouter));
    if (!p) return;

    const existing = this.lignesPieces.find(l => !l.isCustom && l.piece?.id === p.id);
    if (existing) {
      existing.quantite += this.qteAjouter;
      existing.manquant = Math.max(0, existing.quantite - (existing.piece?.stockAtelier ?? 0));
      existing.aSortirMagasin = Math.max(0, existing.quantite - (existing.piece?.stockAtelier ?? 0)) > 0 ? 0 : 1;
    } else {
      const stockAtelier = p.stockAtelier ?? 0;
      const stockMagasin = p.stockMagasin ?? 0;
      const manquant = Math.max(0, this.qteAjouter - stockAtelier);
      this.lignesPieces.push({
        piece: p,
        pieceIdTemp: p.id,
        quantite: this.qteAjouter,
        isCustom: false,
        stockDisponible: stockMagasin + stockAtelier,
        manquant,
        aSortirMagasin: manquant > 0 ? 0 : 1
      });
    }
    this.pieceAjouter = null;
    this.qteAjouter = 1;
  }

  addPieceCustom(): void {
    if (!this.pieceCustomDesignation.trim() || !this.pieceCustomPrix || this.pieceCustomPrix <= 0 || this.pieceCustomQuantite <= 0) return;
    this.lignesPieces.push({
      isCustom: true,
      designationPds: this.pieceCustomDesignation.trim(),
      prixUnitaire: this.pieceCustomPrix,
      quantite: this.pieceCustomQuantite,
      manquant: 0,
      aSortirMagasin: 0
    });
    this.pieceCustomDesignation = '';
    this.pieceCustomPrix = null;
    this.pieceCustomQuantite = 1;
  }

  removePiece(index: number): void {
    this.lignesPieces.splice(index, 1);
  }

  addMO(): void {
    if (!this.moAjouter || this.qteAjouterMO <= 0) return;
    const m = this.allMO.find(item => item.id === Number(this.moAjouter));
    if (!m) return;
    const existing = this.lignesMO.find(l => l.mo?.id === m.id);
    if (existing) {
      existing.quantite += this.qteAjouterMO;
    } else {
      this.lignesMO.push({ mo: m, quantite: this.qteAjouterMO });
    }
    this.moAjouter = null;
    this.qteAjouterMO = 1;
  }

  removeMO(index: number): void {
    this.lignesMO.splice(index, 1);
  }

  get hasAtLeastOneItem(): boolean {
    return (this.lignesPieces && this.lignesPieces.length > 0) || (this.lignesMO && this.lignesMO.length > 0);
  }

  validateStep(): void {
    this.saveStep3();
  }

  saveStep3(): void {
    if (!this.hasAtLeastOneItem) {
      this.errorMessage = "Veuillez ajouter au moins une pièce détachée ou une prestation de main-d'œuvre pour continuer.";
      this.cdr.markForCheck();
      return;
    }

    const payloadLignesPieces = this.lignesPieces.map(l => ({
      pieceId: l.isCustom ? null : (l.piece?.id ?? null),
      quantite: l.quantite,
      prix: l.isCustom ? l.prixUnitaire : (l.piece?.prix ?? null),
      isCustom: l.isCustom ?? false,
      designationPds: l.isCustom ? l.designationPds : undefined,
    }));

    const payloadLignesMO = this.lignesMO.map(l => ({
      mainDoeuvreId: l.mo.id,
      nbreHeure: l.quantite,
      prix: l.mo.prix ?? null,
    }));

    this.saving = true;
    this.ordreService.update(this.ordreId, {
      numero: this.loadedOrdre?.numero || '',
      descriptionTravaux: this.loadedOrdre?.descriptionTravaux || '',
      vehiculeId: this.loadedOrdre?.vehicule?.id || 0,
      statut: 'EN_ATTENTE_PROFORMA' as StatutOrdre,
      lignesPieces: payloadLignesPieces,
      lignesMainDoeuvres: payloadLignesMO,
    }).subscribe({
      next: () => {
        this.ordreService.updateStatut(this.ordreId, 'EN_ATTENTE_PROFORMA').subscribe({
          next: () => {},
          error: () => {}
        });
        this.saving = false;
        this.successMessage = 'Pièces et main-d’œuvre enregistrées.';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-reparation', this.ordreId, 'proforma']);
        }, 500);
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la sauvegarde des pièces et MO.';
        this.cdr.markForCheck();
      }
    });
  }

  formatPiece = (p: any) => p?.reference ? `${p.reference} — ${p.designation}` : '';
  formatMO = (m: any) => m?.description ? `${m.description} (${m.prix} FCFA)` : '';
}
