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
  prixUnitaire?: number;
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
  prixAjouter: number | null = null;

  moAjouter: number | null = null;
  qteAjouterMO = 1;
  prixAjouterMO: number | null = null;

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
      p.designation.toLowerCase().includes(q)
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

  get lignesPiecesCatalogue(): LignePiece[] {
    return this.lignesPieces.filter(l => !l.isCustom);
  }

  get lignesPiecesPds(): LignePiece[] {
    return this.lignesPieces.filter(l => !!l.isCustom);
  }

  get totalPieces(): number {
    return this.lignesPieces.reduce((sum, l) => {
      const price = l.prixUnitaire != null ? l.prixUnitaire : (l.isCustom ? 0 : (l.piece?.prix ?? 0));
      return sum + price * (l.quantite || 0);
    }, 0);
  }

  get totalMO(): number {
    return this.lignesMO.reduce((sum, l) => {
      const price = l.prixUnitaire != null ? l.prixUnitaire : (l.mo?.prix ?? 0);
      return sum + price * (l.quantite || 0);
    }, 0);
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
        // Catalogue : uniquement PDP et PDG (exclure PDS)
        this.allPieces = extractContent<PieceDetache>(pieces as any).filter(p => p.statut === 'ACTIF' && p.type !== 'PDS');
        this.allMO = extractContent<MainDoeuvreModel>(mo as any).filter(m => !m.isArchived);
        this.loadedOrdre = ordre;

        // Cumuler les pièces identiques au chargement
        const piecesMap = new Map<string, any>();
        for (const l of (ordre.lignesOrdreReparationPieces || [])) {
          const pieceId = l.piece?.id ?? (l as any).pieceId;
          const key = l.isCustom 
            ? `custom_${(l.designationPds || '').trim().toLowerCase()}`
            : `cat_${pieceId}`;

          const catalogPiece = !l.isCustom && pieceId
            ? this.allPieces.find(p => p.id === pieceId)
            : null;
          const resolvedPiece = catalogPiece || l.piece;

          // Résolution du prix unitaire :
          // 1. Si un prix explicite > 0 a déjà été fixé, on le conserve
          // 2. Sinon, on prend directement le prix du catalogue
          // 3. Sinon, le prix de la pièce imbriquée
          let unitPrice = 0;
          if (l.prix != null && Number(l.prix) > 0) {
            unitPrice = Number(l.prix);
          } else if (catalogPiece?.prix != null && Number(catalogPiece.prix) > 0) {
            unitPrice = Number(catalogPiece.prix);
          } else if (l.piece?.prix != null && Number(l.piece.prix) > 0) {
            unitPrice = Number(l.piece.prix);
          }

          if (piecesMap.has(key)) {
            const item = piecesMap.get(key);
            item.quantite += (l.quantite || 1);
            if ((item.prixUnitaire == null || item.prixUnitaire === 0) && unitPrice > 0) {
              item.prixUnitaire = unitPrice;
            }
          } else {
            piecesMap.set(key, {
              piece: resolvedPiece,
              pieceIdTemp: pieceId,
              quantite: l.quantite || 1,
              isCustom: !!l.isCustom,
              designationPds: l.designationPds,
              prixUnitaire: unitPrice,
              stockDisponible: l.isCustom ? 0 : ((resolvedPiece?.stockMagasin ?? 0) + (resolvedPiece?.stockAtelier ?? 0)),
              manquant: 0,
              aSortirMagasin: 0
            });
          }
        }

        this.lignesPieces = Array.from(piecesMap.values()).map(lp => {
          if (!lp.isCustom && lp.piece) {
            lp.manquant = Math.max(0, lp.quantite - (lp.piece?.stockAtelier ?? 0));
            lp.aSortirMagasin = lp.manquant > 0 ? 0 : 1;
          }
          return lp;
        });

        // Cumuler les MO identiques au chargement
        const moMap = new Map<number, any>();
        for (const l of (ordre.lignesOrdreReparationMainDoeuvres || [])) {
          const moId = l.mainDoeuvre?.id ?? (l as any).mainDoeuvreId;
          if (!moId) continue;

          const catalogMO = this.allMO.find(m => m.id === moId);
          const resolvedMO = catalogMO || l.mainDoeuvre;

          let unitPrice = 0;
          if (l.prix != null && Number(l.prix) > 0) {
            unitPrice = Number(l.prix);
          } else if (catalogMO?.prix != null && Number(catalogMO.prix) > 0) {
            unitPrice = Number(catalogMO.prix);
          } else if (l.mainDoeuvre?.prix != null && Number(l.mainDoeuvre.prix) > 0) {
            unitPrice = Number(l.mainDoeuvre.prix);
          }

          if (moMap.has(moId)) {
            const item = moMap.get(moId);
            item.quantite += (l.nbreHeure || 1);
            if ((item.prixUnitaire == null || item.prixUnitaire === 0) && unitPrice > 0) {
              item.prixUnitaire = unitPrice;
            }
          } else {
            moMap.set(moId, {
              mo: resolvedMO,
              quantite: l.nbreHeure || 1,
              prixUnitaire: unitPrice
            });
          }
        }

        this.lignesMO = Array.from(moMap.values());

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

  onPieceSelected(pieceId: any): void {
    if (!pieceId) {
      this.prixAjouter = null;
      return;
    }
    const p = this.allPieces.find(item => item.id === Number(pieceId));
    if (p) {
      this.prixAjouter = p.prix ?? null;
    }
  }

  onMoSelected(moId: any): void {
    if (!moId) {
      this.prixAjouterMO = null;
      return;
    }
    const m = this.allMO.find(item => item.id === Number(moId));
    if (m) {
      this.prixAjouterMO = m.prix ?? null;
    }
  }

  addPiece(): void {
    if (!this.pieceAjouter || this.qteAjouter <= 0) return;
    const p = this.allPieces.find(item => item.id === Number(this.pieceAjouter));
    if (!p) return;

    const unitPrice = this.prixAjouter != null && this.prixAjouter >= 0 ? this.prixAjouter : (p.prix ?? 0);

    const existing = this.lignesPieces.find(l => !l.isCustom && l.piece?.id === p.id);
    if (existing) {
      existing.quantite += this.qteAjouter;
      existing.prixUnitaire = unitPrice;
      existing.manquant = Math.max(0, existing.quantite - (existing.piece?.stockAtelier ?? 0));
      existing.aSortirMagasin = existing.manquant > 0 ? 0 : 1;
    } else {
      this.lignesPieces.push({
        isCustom: false,
        piece: p,
        quantite: this.qteAjouter,
        prixUnitaire: unitPrice,
        stockDisponible: (p.stockMagasin ?? 0) + (p.stockAtelier ?? 0),
        manquant: Math.max(0, this.qteAjouter - (p.stockAtelier ?? 0)),
        aSortirMagasin: Math.max(0, this.qteAjouter - (p.stockAtelier ?? 0)) > 0 ? 0 : 1
      });
    }

    this.pieceAjouter = null;
    this.qteAjouter = 1;
    this.prixAjouter = null;
  }

  addPieceCustom(): void {
    if (!this.pieceCustomDesignation.trim() || this.pieceCustomQuantite <= 0) return;

    const unitPrice = this.pieceCustomPrix != null && this.pieceCustomPrix >= 0 ? this.pieceCustomPrix : 0;
    const des = this.pieceCustomDesignation.trim();

    const existing = this.lignesPieces.find(l => l.isCustom && (l.designationPds || '').trim().toLowerCase() === des.toLowerCase());
    if (existing) {
      existing.quantite += this.pieceCustomQuantite;
      if (unitPrice > 0) {
        existing.prixUnitaire = unitPrice;
      }
    } else {
      this.lignesPieces.push({
        isCustom: true,
        designationPds: des,
        prixUnitaire: unitPrice,
        quantite: this.pieceCustomQuantite,
        manquant: 0,
        aSortirMagasin: 0
      });
    }
    this.pieceCustomDesignation = '';
    this.pieceCustomPrix = null;
    this.pieceCustomQuantite = 1;
  }

  removePiece(index: number): void {
    this.lignesPieces.splice(index, 1);
  }

  removePieceItem(item: LignePiece): void {
    const idx = this.lignesPieces.indexOf(item);
    if (idx !== -1) {
      this.lignesPieces.splice(idx, 1);
      this.cdr.markForCheck();
    }
  }

  onPieceQuantiteChange(l: LignePiece): void {
    if (!l.isCustom && l.piece) {
      l.manquant = Math.max(0, (l.quantite || 0) - (l.piece?.stockAtelier ?? 0));
      l.aSortirMagasin = l.manquant > 0 ? 0 : 1;
    }
    this.cdr.markForCheck();
  }

  addMO(): void {
    if (!this.moAjouter || this.qteAjouterMO <= 0) return;
    const m = this.allMO.find(item => item.id === Number(this.moAjouter));
    if (!m) return;
    const unitPrice = this.prixAjouterMO != null && this.prixAjouterMO >= 0 ? this.prixAjouterMO : (m.prix ?? 0);
    const existing = this.lignesMO.find(l => l.mo?.id === m.id);
    if (existing) {
      existing.quantite += this.qteAjouterMO;
      existing.prixUnitaire = unitPrice;
    } else {
      this.lignesMO.push({ mo: m, quantite: this.qteAjouterMO, prixUnitaire: unitPrice });
    }
    this.moAjouter = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
  }

  removeMO(index: number): void {
    this.lignesMO.splice(index, 1);
  }

  removeMoItem(item: LigneMO): void {
    const idx = this.lignesMO.indexOf(item);
    if (idx !== -1) {
      this.lignesMO.splice(idx, 1);
      this.cdr.markForCheck();
    }
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

    const payloadLignesPieces = this.lignesPieces.map(l => {
      const pieceId = l.isCustom ? null : (l.piece?.id ?? null);
      const catPiece = pieceId ? this.allPieces.find(p => p.id === pieceId) : null;
      let finalPrice = 0;
      if (l.prixUnitaire != null && Number(l.prixUnitaire) >= 0) {
        finalPrice = Number(l.prixUnitaire);
      } else if (catPiece?.prix != null) {
        finalPrice = Number(catPiece.prix);
      } else if (l.piece?.prix != null) {
        finalPrice = Number(l.piece.prix);
      }

      return {
        pieceId,
        quantite: l.quantite,
        prix: finalPrice,
        isCustom: l.isCustom ?? false,
        designationPds: l.isCustom ? l.designationPds : undefined,
      };
    });

    const payloadLignesMO = this.lignesMO.map(l => {
      const moId = l.mo.id;
      const catMO = this.allMO.find(m => m.id === moId);
      let finalPrice = 0;
      if (l.prixUnitaire != null && Number(l.prixUnitaire) >= 0) {
        finalPrice = Number(l.prixUnitaire);
      } else if (catMO?.prix != null) {
        finalPrice = Number(catMO.prix);
      } else if (l.mo?.prix != null) {
        finalPrice = Number(l.mo.prix);
      }

      return {
        mainDoeuvreId: moId,
        nbreHeure: l.quantite,
        prix: finalPrice,
      };
    });

    this.saving = true;
    this.ordreService.update(this.ordreId, {
      numero: this.loadedOrdre?.numero || '',
      descriptionTravaux: this.loadedOrdre?.descriptionTravaux || '',
      vehiculeId: this.loadedOrdre?.vehicule?.id || 0,
      statut: 'PROFORMA' as StatutOrdre,
      lignesPieces: payloadLignesPieces,
      lignesMainDoeuvres: payloadLignesMO,
    }).subscribe({
      next: () => {
        this.ordreService.updateStatut(this.ordreId, 'PROFORMA').subscribe({
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

  formatPiece = (p: any) => {
    if (!p) return '';
    const type = p.type ? `[${p.type}] ` : '';
    const ref = p.reference ? `${p.reference} — ` : '';
    const des = p.designation || '';
    const prix = p.prix != null ? ` (${p.prix} FCFA)` : '';
    return `${type}${ref}${des}${prix}`;
  };

  formatMO = (m: any) => {
    if (!m) return '';
    const prix = m.prix != null ? ` (${m.prix} FCFA)` : '';
    return `${m.description || ''}${prix}`;
  };
}
