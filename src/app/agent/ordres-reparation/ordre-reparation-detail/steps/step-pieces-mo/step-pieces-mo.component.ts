import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { ProformaService } from '../../../../proforma/proforma.service';
import { PieceDetacheeService } from '../../../../pieces-detachees/piece-detachee.service';
import { MainDoeuvreService } from '../../../../main-doeuvre/main-doeuvre.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { SearchableSelectComponent } from '../../../../../shared/components/searchable-select/searchable-select.component';
import {
  OrdreReparation,
  PieceDetache,
  MainDoeuvreModel,
  StatutOrdre,
  StepPiecesMoDto,
  extractContent
} from '../../../../../shared/models';
import { StepPiecesMoResponseDto } from '../../../models/responses';

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
  private proformaService = inject(ProformaService);
  private pieceService = inject(PieceDetacheeService);
  private moService = inject(MainDoeuvreService);
  cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: StepPiecesMoResponseDto | null = null;

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  allPieces: PieceDetache[] = [];
  allMO: MainDoeuvreModel[] = [];

  lignesPieces: LignePiece[] = [];
  lignesMO: LigneMO[] = [];

  piecePdpAjouter: number | null = null;
  qteAjouterPdp = 1;
  prixAjouterPdp: number | null = null;

  piecePdgAjouter: number | null = null;
  qteAjouterPdg = 1;
  prixAjouterPdg: number | null = null;

  moAjouter: number | null = null;
  qteAjouterMO = 1;
  prixAjouterMO: number | null = null;

  pieceCustomDesignation = '';
  pieceCustomPrix: number | null = null;
  pieceCustomQuantite = 1;

  piecePdpSearch = '';
  piecePdgSearch = '';
  moSearch = '';

  get piecesPdpFiltrees(): PieceDetache[] {
    const q = this.piecePdpSearch.toLowerCase();
    const pdpPieces = this.allPieces.filter(p => p.type === 'PDP');
    if (!q) return pdpPieces.slice(0, 30);
    return pdpPieces.filter(p =>
      p.reference.toLowerCase().includes(q) ||
      p.designation.toLowerCase().includes(q)
    ).slice(0, 30);
  }

  get piecesPdgFiltrees(): PieceDetache[] {
    const q = this.piecePdgSearch.toLowerCase();
    const pdgPieces = this.allPieces.filter(p => p.type === 'PDG');
    if (!q) return pdgPieces.slice(0, 30);
    return pdgPieces.filter(p =>
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

  get lignesPiecesPdp(): LignePiece[] {
    return this.lignesPieces.filter(l => !l.isCustom && l.piece?.type === 'PDP');
  }

  get lignesPiecesPdg(): LignePiece[] {
    return this.lignesPieces.filter(l => !l.isCustom && l.piece?.type === 'PDG');
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
      ordre: this.ordreService.getStepPiecesMo(this.ordreId),
      proforma: this.proformaService.getByOrdreReparationId(this.ordreId).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: ({ pieces, mo, ordre, proforma }) => {
        // Catalogue : uniquement PDP et PDG (exclure PDS)
        this.allPieces = extractContent<PieceDetache>(pieces as any).filter(p => p.statut === 'ACTIF' && p.type !== 'PDS');
        this.allMO = extractContent<MainDoeuvreModel>(mo as any).filter(m => !m.isArchived);
        this.loadedOrdre = ordre;

        const hasProformaLines = proforma && (
          (proforma.lignesPieces && proforma.lignesPieces.length > 0) ||
          (proforma.lignesMainDoeuvres && proforma.lignesMainDoeuvres.length > 0) ||
          ((proforma as any).pieces && (proforma as any).pieces.length > 0) ||
          ((proforma as any).mainsDoeuvre && (proforma as any).mainsDoeuvre.length > 0)
        );

        if (hasProformaLines) {
          // ══════════════════════════════════════════════════════════════════════
          // CAS 1 : LE PROFORMA EXISTE DÉJÀ -> CHARGER DEPUIS LE PROFORMA
          // ══════════════════════════════════════════════════════════════════════
          const piecesMap = new Map<string, any>();
          const proformaPieces: any[] = proforma.lignesPieces || (proforma as any).pieces || [];
          for (const l of proformaPieces) {
            const pieceId = l.pieceId ?? l.piece?.id ?? null;
            const isCustom = !!(l.isCustom || l.custom || !pieceId || l.designationPds);
            const key = isCustom
              ? `custom_${(l.designationPds || l.designationPiece || '').trim().toLowerCase()}`
              : `cat_${pieceId}`;

            const catalogPiece = !isCustom && pieceId
              ? this.allPieces.find(p => p.id === Number(pieceId))
              : null;
            const resolvedPiece = catalogPiece || l.piece;

            let unitPrice = 0;
            if (l.prix != null && Number(l.prix) >= 0) {
              unitPrice = Number(l.prix);
            } else if (l.prixUnitaire != null && Number(l.prixUnitaire) >= 0) {
              unitPrice = Number(l.prixUnitaire);
            } else if (l.montantTotal != null && l.quantite) {
              unitPrice = Number(l.montantTotal) / Number(l.quantite);
            } else if (catalogPiece?.prix != null) {
              unitPrice = Number(catalogPiece.prix);
            }

            const qte = Number(l.quantite ?? l.qte ?? 1) || 1;
            const des = l.designationPds || l.designationPiece || resolvedPiece?.designation || (isCustom ? 'Pièce à saisir' : 'Pièce détachée');

            if (piecesMap.has(key)) {
              const item = piecesMap.get(key);
              item.quantite += qte;
              if ((item.prixUnitaire == null || item.prixUnitaire === 0) && unitPrice > 0) {
                item.prixUnitaire = unitPrice;
              }
            } else {
              piecesMap.set(key, {
                piece: resolvedPiece,
                pieceIdTemp: isCustom ? null : (pieceId ? Number(pieceId) : null),
                quantite: qte,
                isCustom,
                designationPds: des,
                prixUnitaire: unitPrice,
                stockDisponible: isCustom ? 0 : ((resolvedPiece?.stockMagasin ?? 0) + (resolvedPiece?.stockAtelier ?? 0)),
                manquant: 0,
                aSortirMagasin: 0
              });
            }
          }

          this.lignesPieces = Array.from(piecesMap.values()).map(lp => {
            if (!lp.isCustom && lp.piece) {
              lp.manquant = Math.max(0, lp.quantite - (lp.piece?.stockMagasin ?? 0));
              lp.aSortirMagasin = lp.manquant > 0 ? 0 : 1;
            }
            return lp;
          });

          // MO depuis le Proforma
          const moMap = new Map<number | string, any>();
          const proformaMo: any[] = proforma.lignesMainDoeuvres || (proforma as any).lignesMainDoeuvre || (proforma as any).mainsDoeuvre || [];
          for (const l of proformaMo) {
            const moId = l.mainDoeuvreId ?? l.mainDoeuvre?.id ?? null;
            let catalogMO = null;
            if (moId) {
              catalogMO = this.allMO.find(m => m.id === Number(moId));
            } else if (l.descriptionMainDoeuvre || l.description) {
              const desc = l.descriptionMainDoeuvre || l.description;
              catalogMO = this.allMO.find(m => m.description === desc);
            }

            const resolvedMO = catalogMO || l.mainDoeuvre || {
              id: moId || Date.now(),
              description: l.descriptionMainDoeuvre || l.description || 'Prestation main-d’œuvre',
              prix: l.tarifHoraire ?? l.prix
            };
            const mapKey = resolvedMO.id || (l.descriptionMainDoeuvre || l.description || 'mo');

            let unitPrice = 0;
            if (l.tarifHoraire != null && Number(l.tarifHoraire) >= 0) {
              unitPrice = Number(l.tarifHoraire);
            } else if (l.prix != null && Number(l.prix) >= 0) {
              unitPrice = Number(l.prix);
            } else if (l.prixUnitaire != null && Number(l.prixUnitaire) >= 0) {
              unitPrice = Number(l.prixUnitaire);
            } else if (l.montantTotal != null && (l.nbreHeure || l.heures)) {
              unitPrice = Number(l.montantTotal) / Number(l.nbreHeure || l.heures);
            } else if (resolvedMO?.prix != null) {
              unitPrice = Number(resolvedMO.prix);
            }

            const qte = Number(l.nbreHeure ?? l.heures ?? l.quantite ?? 1) || 1;

            if (moMap.has(mapKey)) {
              const item = moMap.get(mapKey);
              item.quantite += qte;
              if ((item.prixUnitaire == null || item.prixUnitaire === 0) && unitPrice > 0) {
                item.prixUnitaire = unitPrice;
              }
            } else {
              moMap.set(mapKey, {
                mo: resolvedMO,
                quantite: qte,
                prixUnitaire: unitPrice
              });
            }
          }

          this.lignesMO = Array.from(moMap.values());
        } else {
          // ══════════════════════════════════════════════════════════════════════
          // CAS 2 : PAS ENCORE DE PROFORMA -> CHARGER DEPUIS LE DIAGNOSTIC/ORDRE
          // ══════════════════════════════════════════════════════════════════════
          const piecesMap = new Map<string, any>();
          const fetchedPieces = ordre.lignesOrdreReparationPieces || (ordre as any).lignesPieces || [];
          for (const l of fetchedPieces) {
            const pieceId = l.piece?.id ?? (l as any).pieceId;
            const key = l.isCustom 
              ? `custom_${(l.designationPds || '').trim().toLowerCase()}`
              : `cat_${pieceId}`;

            const catalogPiece = !l.isCustom && pieceId
              ? this.allPieces.find(p => p.id === pieceId)
              : null;
            const resolvedPiece = catalogPiece || l.piece;

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
              lp.manquant = Math.max(0, lp.quantite - (lp.piece?.stockMagasin ?? 0));
              lp.aSortirMagasin = lp.manquant > 0 ? 0 : 1;
            }
            return lp;
          });

          // Cumuler les MO de l'ordre
          const moMap = new Map<number, any>();
          const fetchedMo = ordre.lignesOrdreReparationMainDoeuvres || (ordre as any).lignesMainDoeuvres || [];
          for (const l of fetchedMo) {
            let catalogMO = null;
            
            if (l.mainDoeuvre?.id) {
              catalogMO = this.allMO.find(m => m.id === l.mainDoeuvre.id);
            } else if ((l as any).mainDoeuvreId) {
              catalogMO = this.allMO.find(m => m.id === (l as any).mainDoeuvreId);
            } else if (l.description) {
              catalogMO = this.allMO.find(m => m.description === l.description);
            }

            const resolvedMO = catalogMO || l.mainDoeuvre || { id: l.id || Date.now(), description: l.description, prix: l.prix };
            const moId = resolvedMO.id;

            if (!moId) continue;

            let unitPrice = 0;
            if (l.prix != null && Number(l.prix) > 0) {
              unitPrice = Number(l.prix);
            } else if (resolvedMO?.prix != null && Number(resolvedMO.prix) > 0) {
              unitPrice = Number(resolvedMO.prix);
            }

            if (moMap.has(moId)) {
              const item = moMap.get(moId);
              item.quantite += (l.nbreHeure ?? l.heures ?? 1);
              if ((item.prixUnitaire == null || item.prixUnitaire === 0) && unitPrice > 0) {
                item.prixUnitaire = unitPrice;
              }
            } else {
              moMap.set(moId, {
                mo: resolvedMO,
                quantite: l.nbreHeure ?? l.heures ?? 1,
                prixUnitaire: unitPrice
              });
            }
          }

          this.lignesMO = Array.from(moMap.values());
        }

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

  onPiecePdpSelected(pieceId: any): void {
    if (!pieceId) {
      this.prixAjouterPdp = null;
      return;
    }
    const p = this.allPieces.find(item => item.id === Number(pieceId));
    if (p) {
      this.prixAjouterPdp = p.prix ?? null;
    }
  }

  onPiecePdgSelected(pieceId: any): void {
    if (!pieceId) {
      this.prixAjouterPdg = null;
      return;
    }
    const p = this.allPieces.find(item => item.id === Number(pieceId));
    if (p) {
      this.prixAjouterPdg = p.prix ?? null;
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

  addPiecePdp(): void {
    if (!this.piecePdpAjouter || this.qteAjouterPdp <= 0) return;
    const p = this.allPieces.find(item => item.id === Number(this.piecePdpAjouter));
    if (!p) return;

    const unitPrice = this.prixAjouterPdp != null && this.prixAjouterPdp >= 0 ? this.prixAjouterPdp : (p.prix ?? 0);

    const existing = this.lignesPieces.find(l => !l.isCustom && l.piece?.id === p.id);
    if (existing) {
      existing.quantite += this.qteAjouterPdp;
      existing.prixUnitaire = unitPrice;
      existing.manquant = Math.max(0, existing.quantite - (existing.piece?.stockMagasin ?? 0));
      existing.aSortirMagasin = existing.manquant > 0 ? 0 : 1;
    } else {
      this.lignesPieces.push({
        isCustom: false,
        piece: p,
        quantite: this.qteAjouterPdp,
        prixUnitaire: unitPrice,
        stockDisponible: (p.stockMagasin ?? 0) + (p.stockAtelier ?? 0),
        manquant: Math.max(0, this.qteAjouterPdp - (p.stockMagasin ?? 0)),
        aSortirMagasin: Math.max(0, this.qteAjouterPdp - (p.stockMagasin ?? 0)) > 0 ? 0 : 1
      });
    }

    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
  }

  addPiecePdg(): void {
    if (!this.piecePdgAjouter || this.qteAjouterPdg <= 0) return;
    const p = this.allPieces.find(item => item.id === Number(this.piecePdgAjouter));
    if (!p) return;

    const unitPrice = this.prixAjouterPdg != null && this.prixAjouterPdg >= 0 ? this.prixAjouterPdg : (p.prix ?? 0);

    const existing = this.lignesPieces.find(l => !l.isCustom && l.piece?.id === p.id);
    if (existing) {
      existing.quantite += this.qteAjouterPdg;
      existing.prixUnitaire = unitPrice;
      existing.manquant = Math.max(0, existing.quantite - (existing.piece?.stockMagasin ?? 0));
      existing.aSortirMagasin = existing.manquant > 0 ? 0 : 1;
    } else {
      this.lignesPieces.push({
        isCustom: false,
        piece: p,
        quantite: this.qteAjouterPdg,
        prixUnitaire: unitPrice,
        stockDisponible: (p.stockMagasin ?? 0) + (p.stockAtelier ?? 0),
        manquant: Math.max(0, this.qteAjouterPdg - (p.stockMagasin ?? 0)),
        aSortirMagasin: Math.max(0, this.qteAjouterPdg - (p.stockMagasin ?? 0)) > 0 ? 0 : 1
      });
    }

    this.piecePdgAjouter = null;
    this.qteAjouterPdg = 1;
    this.prixAjouterPdg = null;
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
      l.manquant = Math.max(0, (l.quantite || 0) - (l.piece?.stockMagasin ?? 0));
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

    const payload: StepPiecesMoDto = {
      lignesPieces: payloadLignesPieces,
      lignesMainDoeuvres: payloadLignesMO,
    };

    this.saving = true;
    this.ordreService.updateStepPiecesMo(this.ordreId, payload).subscribe({
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
