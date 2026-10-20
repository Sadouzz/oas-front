import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepApprovisionnementResponseDto, StatutOrdreTravail, PieceApprovisionnementDto } from '../../../models/ordre-travail.model';
import { BonDeCommandeService, LigneBonDeCommandeRequest, ReceptionBonDeCommandeRequest } from '../../../../bons-commande/bon-de-commande.service';
import { FournisseurService } from '../../../../fournisseurs/fournisseur.service';
import { FournisseurModel } from '../../../../../shared/models';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { SearchableSelectComponent } from '../../../../../shared/components/searchable-select/searchable-select.component';

export interface PieceACommanderItem {
  key: string;
  pieceId?: number;
  designation: string;
  reference?: string;
  type?: string;
  isCustom?: boolean;
  quantiteDemandee: number;
  stockMagasin: number;
  quantiteManquante: number;
  quantiteDejaCommandee: number;
  quantiteACommander: number;
  maxACommander: number;
  prixUnitaire: number;
  fournisseurId: number | null;
  selected: boolean;
}

export interface ReceptionLigneItem {
  ligneId: number;
  designationPiece: string;
  reference: string;
  quantiteTotale: number;
  quantiteDejaRecue: number;
  quantiteRestante: number;
  quantiteRecue: number;
  isFullyReceived: boolean;
}

@Component({
  selector: 'app-step-approvisionnement',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent, SearchableSelectComponent],
  templateUrl: './step-approvisionnement.component.html'
})
export class StepApprovisionnementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private bdcService = inject(BonDeCommandeService);
  private fournisseurService = inject(FournisseurService);
  private cdr = inject(ChangeDetectorRef);

  otId!: number;
  data: StepApprovisionnementResponseDto | null = null;
  loading = true;
  advancing = false;
  errorMessage = '';
  successMessage = '';

  // Modal Création Bon de Commande
  showBDCModal = false;
  bdcSaving = false;
  modalErrorMessage = '';
  globalFournisseurId: number | null = null;
  fournisseurs: FournisseurModel[] = [];
  piecesToCommand: PieceACommanderItem[] = [];

  // Modal Bon de Réception
  showReceptionModal = false;
  receptionSaving = false;
  receptionErrorMessage = '';
  selectedBonForReception: any | null = null;
  receptionLignes: ReceptionLigneItem[] = [];
  actioningBdcId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-travail']);
      return;
    }
    this.otId = +idParam;
    this.loadData();
    this.loadFournisseurs();
  }

  loadData(): void {
    this.loading = true;
    this.otService.getStepApprovisionnement(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de l\'approvisionnement.';
        this.cdr.detectChanges();
      }
    });
  }

  loadFournisseurs(): void {
    this.fournisseurService.getAll({ size: 100 }).subscribe({
      next: (res: any) => {
        const list = res?.data?.content || res?.content || res?.data || res || [];
        this.fournisseurs = Array.isArray(list) ? list : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.fournisseurs = [];
      }
    });
  }

  get hasPiecesManquantes(): boolean {
    return !!(this.data?.piecesManquantesProforma && this.data.piecesManquantesProforma.some(p => !this.isPieceComplete(p)));
  }

  get totalPiecesManquantes(): number {
    if (!this.data?.piecesManquantesProforma) return 0;
    return this.data.piecesManquantesProforma.reduce((sum, p) => sum + (Number(p.quantiteManquante) || 0), 0);
  }

  get hasBonsDeCommande(): boolean {
    return !!(this.data?.bonsDeCommande && this.data.bonsDeCommande.length > 0);
  }

  getResteACommander(p: PieceApprovisionnementDto): number {
    if (this.isPieceComplete(p)) return 0;
    const manquant = p.quantiteManquante != null ? Number(p.quantiteManquante) : Math.max(0, Number(p.quantiteDemandee || 0) - Number(p.stockMagasin || 0));
    const commande = Number(p.quantiteCommande || 0);
    const recu = Number(p.quantiteRecue || 0);
    const enTransit = Math.max(0, commande - recu);
    return Math.max(0, manquant - enTransit);
  }

  get piecesRestantesACommander(): PieceApprovisionnementDto[] {
    return (this.data?.piecesManquantesProforma || []).filter(p => this.getResteACommander(p) > 0);
  }

  get totalQuantiteRestanteACommander(): number {
    return this.piecesRestantesACommander.reduce((sum, p) => sum + this.getResteACommander(p), 0);
  }

  get canCreateBonDeCommande(): boolean {
    return this.piecesRestantesACommander.length > 0;
  }

  get isToutCommande(): boolean {
    return this.hasPiecesManquantes && this.piecesRestantesACommander.length === 0;
  }

  isPieceComplete(p: PieceApprovisionnementDto): boolean {
    const demandee = Number(p.quantiteDemandee || 0);
    const stock = Number(p.stockMagasin || 0);
    const manquant = Number(p.quantiteManquante || 0);

    if (p.isManquant === false) return true;
    if (stock >= demandee && demandee > 0) return true;
    if (manquant <= 0) return true;

    return false;
  }

  get isAllApprovisionnementComplete(): boolean {
    const missing = this.data?.piecesManquantesProforma;
    if (!missing || missing.length === 0) {
      return true;
    }
    return missing.every(p => this.isPieceComplete(p));
  }

  get piecesIncompletes(): PieceApprovisionnementDto[] {
    return (this.data?.piecesManquantesProforma || []).filter(p => !this.isPieceComplete(p));
  }

  get totalPiecesIncompletes(): number {
    return this.piecesIncompletes.reduce((sum, p) => sum + (Number(p.quantiteManquante) || 0), 0);
  }

  // ─── Modal BDC ─────────────────────────────────────────────────────────

  openBDCModal(): void {
    if (!this.canCreateBonDeCommande) {
      return;
    }
    this.modalErrorMessage = '';
    this.initPiecesToCommand();
    this.loadFournisseurs();
    this.showBDCModal = true;
    this.cdr.detectChanges();
  }

  closeBDCModal(): void {
    this.showBDCModal = false;
    this.bdcSaving = false;
    this.modalErrorMessage = '';
    this.cdr.detectChanges();
  }

  initPiecesToCommand(): void {
    const missing = this.piecesRestantesACommander;
    this.piecesToCommand = missing.map((p, idx) => {
      const reste = this.getResteACommander(p);
      return {
        key: p.pieceId ? `piece_${p.pieceId}` : `ligne_${p.ligneId || idx}`,
        pieceId: p.pieceId,
        designation: p.designation || 'Pièce',
        reference: p.reference,
        type: p.type || 'PDP',
        isCustom: !!p.isCustom,
        quantiteDemandee: p.quantiteDemandee,
        stockMagasin: p.stockMagasin || 0,
        quantiteManquante: p.quantiteManquante || reste,
        quantiteDejaCommandee: Number(p.quantiteCommande || 0),
        quantiteACommander: reste,
        maxACommander: reste,
        prixUnitaire: p.prixUnitaire || 0,
        fournisseurId: this.globalFournisseurId || null,
        selected: true
      };
    });
  }

  applyGlobalFournisseur(fId: any): void {
    const val = fId ? Number(fId) : null;
    this.globalFournisseurId = val;
    if (val) {
      this.piecesToCommand.forEach(p => {
        if (p.selected) {
          p.fournisseurId = val;
        }
      });
    }
    this.cdr.detectChanges();
  }

  getFournisseurName(f: FournisseurModel): string {
    return f.nomEntreprise || ((f.prenom || '') + ' ' + (f.nom || '')).trim() || `Fournisseur #${f.id}`;
  }

  formatFournisseur = (f: FournisseurModel): string => {
    return this.getFournisseurName(f);
  };

  get selectedPiecesToCommand(): PieceACommanderItem[] {
    return this.piecesToCommand.filter(p => p.selected && p.quantiteACommander > 0);
  }

  get isAllSelectedFournisseursSet(): boolean {
    const selected = this.selectedPiecesToCommand;
    return selected.length > 0 && selected.every(p => !!p.fournisseurId);
  }

  getGroupSummary(): { fournisseurId: number; fournisseurNom: string; piecesCount: number; totalQuantite: number; totalMontant: number }[] {
    const map = new Map<number, { piecesCount: number; totalQuantite: number; totalMontant: number }>();
    for (const p of this.selectedPiecesToCommand) {
      if (!p.fournisseurId) continue;
      const current = map.get(p.fournisseurId) || { piecesCount: 0, totalQuantite: 0, totalMontant: 0 };
      current.piecesCount += 1;
      current.totalQuantite += Number(p.quantiteACommander) || 0;
      current.totalMontant += (Number(p.quantiteACommander) || 0) * (Number(p.prixUnitaire) || 0);
      map.set(p.fournisseurId, current);
    }
    return Array.from(map.entries()).map(([fId, stats]) => {
      const f = this.fournisseurs.find(x => x.id === fId);
      return {
        fournisseurId: fId,
        fournisseurNom: f ? this.getFournisseurName(f) : `Fournisseur #${fId}`,
        piecesCount: stats.piecesCount,
        totalQuantite: stats.totalQuantite,
        totalMontant: stats.totalMontant
      };
    });
  }

  getDistinctFournisseurCount(): number {
    const set = new Set(this.selectedPiecesToCommand.map(p => p.fournisseurId).filter(Boolean));
    return set.size;
  }

  createBonDeCommande(): void {
    const selected = this.selectedPiecesToCommand;
    if (selected.length === 0) {
      this.modalErrorMessage = 'Veuillez sélectionner au moins une pièce à commander.';
      return;
    }
    if (!this.isAllSelectedFournisseursSet) {
      this.modalErrorMessage = 'Veuillez sélectionner un fournisseur pour chaque pièce à commander.';
      return;
    }

    const groups = new Map<number, PieceACommanderItem[]>();
    for (const item of selected) {
      if (!item.fournisseurId) continue;
      const list = groups.get(item.fournisseurId) || [];
      list.push(item);
      groups.set(item.fournisseurId, list);
    }

    this.bdcSaving = true;
    this.modalErrorMessage = '';
    this.errorMessage = '';
    this.successMessage = '';

    const requests = Array.from(groups.entries()).map(([fournisseurId, items]) => {
      const lignes: LigneBonDeCommandeRequest[] = items.map(p => ({
        pieceDetacheeId: p.pieceId ? Number(p.pieceId) : undefined,
        quantite: Number(p.quantiteACommander) || 1,
        prixUnitaire: Number(p.prixUnitaire) || 0,
        designationPds: p.isCustom ? p.designation : undefined,
        typePiece: p.type || (p.isCustom ? 'PDS' : 'PDP')
      }));

      const payload: any = {
        fournisseurId,
        vehiculeId: this.data?.vehiculeId ?? null,
        ordreTravailId: this.otId,
        ordreReparationId: this.data?.ordreReparationId ?? null,
        tvaApplicable: true,
        observation: `Approvisionnement pièces pour OT ${this.data?.numero || '#' + this.otId} (Proforma ${this.data?.proformaNumero || ''})`,
        lignes
      };
      return this.bdcService.create(payload);
    });

    forkJoin(requests).subscribe({
      next: (createdBons) => {
        this.bdcSaving = false;
        this.showBDCModal = false;
        const count = createdBons.length;
        this.successMessage = `${count} bon${count > 1 ? 's' : ''} de commande fournisseur créé${count > 1 ? 's' : ''} avec succès !`;
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.bdcSaving = false;
        this.modalErrorMessage = err?.error?.message || 'Erreur lors de la création des bons de commande.';
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Modal Bon de Réception ──────────────────────────────────────────

  openReceptionPopup(bonId: number): void {
    this.receptionErrorMessage = '';
    this.receptionSaving = false;

    const bonFromData = this.data?.bonsDeCommande?.find(b => b.id === bonId);
    if (bonFromData && bonFromData.pieces && bonFromData.pieces.length > 0) {
      this.selectedBonForReception = bonFromData;
      this.initReceptionLignes(bonFromData);
      this.showReceptionModal = true;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.bdcService.getById(bonId).subscribe({
      next: (fullBon: any) => {
        const bon = fullBon?.data || fullBon;
        this.selectedBonForReception = bon;
        this.initReceptionLignes(bon);
        this.loading = false;
        this.showReceptionModal = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Impossible de récupérer les informations du bon de commande.';
        this.cdr.detectChanges();
      }
    });
  }

  closeReceptionModal(): void {
    this.showReceptionModal = false;
    this.receptionSaving = false;
    this.receptionErrorMessage = '';
    this.selectedBonForReception = null;
    this.receptionLignes = [];
    this.cdr.detectChanges();
  }

  initReceptionLignes(bon: any): void {
    const rawLignes = bon.lignes || bon.pieces || [];
    this.receptionLignes = rawLignes.map((l: any) => {
      const qteTotale = Number(l.quantite) || 0;
      const qteDejaRecue = Number(l.quantiteRecue) || 0;
      const qteRestante = Math.max(0, qteTotale - qteDejaRecue);
      const isFully = qteDejaRecue >= qteTotale && qteTotale > 0;
      return {
        ligneId: l.ligneId || l.id,
        designationPiece: l.designation || l.designationPiece || l.reference || 'Pièce',
        reference: l.reference || '',
        quantiteTotale: qteTotale,
        quantiteDejaRecue: qteDejaRecue,
        quantiteRestante: qteRestante,
        quantiteRecue: isFully ? 0 : qteRestante,
        isFullyReceived: isFully,
      };
    });
  }

  get allPiecesAlreadyReceived(): boolean {
    return this.receptionLignes.length > 0 && this.receptionLignes.every(l => l.isFullyReceived);
  }

  get totalQuantiteRecueNow(): number {
    return this.receptionLignes
      .filter(l => !l.isFullyReceived)
      .reduce((sum, l) => sum + (Number(l.quantiteRecue) || 0), 0);
  }

  saveReception(): void {
    if (!this.selectedBonForReception) return;
    this.receptionErrorMessage = '';

    if (this.allPiecesAlreadyReceived) {
      this.receptionErrorMessage = 'Toutes les pièces de ce bon de commande ont déjà été intégralement réceptionnées.';
      this.cdr.detectChanges();
      return;
    }

    const nonFullyLines = this.receptionLignes.filter(l => !l.isFullyReceived);
    const totalNewReceived = nonFullyLines.reduce((sum, l) => sum + (Number(l.quantiteRecue) || 0), 0);

    if (nonFullyLines.length > 0 && totalNewReceived <= 0) {
      this.receptionErrorMessage = 'Veuillez renseigner au moins une quantité reçue supérieure à 0.';
      this.cdr.detectChanges();
      return;
    }

    this.receptionSaving = true;
    this.cdr.detectChanges();

    const request: ReceptionBonDeCommandeRequest = {
      lignes: this.receptionLignes.map(l => ({
        ligneId: l.ligneId,
        quantiteRecue: l.isFullyReceived ? 0 : (Number(l.quantiteRecue) || 0),
      }))
    };

    const doReception = () => {
      this.bdcService.receptionnerAvecReception(this.selectedBonForReception.id, request).subscribe({
        next: () => {
          this.receptionSaving = false;
          this.showReceptionModal = false;
          this.successMessage = 'Bon de réception validé avec succès ! Le stock magasin a été mis à jour.';
          this.loadData();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.receptionSaving = false;
          this.receptionErrorMessage = err?.error?.message || 'Erreur lors de la validation de la réception.';
          this.cdr.detectChanges();
        }
      });
    };

    if (this.selectedBonForReception.statut === 'EN_ATTENTE') {
      this.bdcService.envoyer(this.selectedBonForReception.id).subscribe({
        next: () => doReception(),
        error: () => doReception()
      });
    } else {
      doReception();
    }
  }

  envoyerBdc(id: number): void {
    this.actioningBdcId = id;
    this.bdcService.envoyer(id).subscribe({
      next: () => {
        this.actioningBdcId = null;
        this.successMessage = 'Bon de commande marqué comme envoyé au fournisseur.';
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.actioningBdcId = null;
        this.errorMessage = err?.error?.message || 'Erreur lors de l\'envoi du bon de commande.';
        this.cdr.detectChanges();
      }
    });
  }

  continuerVersBonSortie(): void {
    if (!this.isAllApprovisionnementComplete) {
      const nbIncomplet = this.piecesIncompletes.length;
      this.errorMessage = `Impossible de continuer : ${nbIncomplet} référence(s) de pièces (${this.totalPiecesIncompletes} unité(s)) sont incomplètes ou non encore réceptionnées au magasin.`;
      this.cdr.detectChanges();
      return;
    }

    this.advancing = true;
    if (this.data?.statut === StatutOrdreTravail.BON_DE_COMMANDE) {
      this.otService.updateStatut(this.otId, StatutOrdreTravail.BON_DE_SORTIE).subscribe({
        next: () => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-travail', this.otId, 'bon-sortie']);
        },
        error: (err) => {
          this.advancing = false;
          this.errorMessage = err?.error?.message || 'Erreur lors de la mise à jour du statut.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.advancing = false;
      this.router.navigate(['/app/ordres-travail', this.otId, 'bon-sortie']);
    }
  }
}
