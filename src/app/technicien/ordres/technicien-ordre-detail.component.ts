import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TechnicienPortalService } from '../services/technicien-portal.service';
import { PieceDetacheeService } from '../../agent/pieces-detachees/piece-detachee.service';
import { MainDoeuvreService } from '../../agent/main-doeuvre/main-doeuvre.service';
import { OrdreReparation, PieceJointeDiagnostic, TypePieceJointeDiagnostic, RemarqueDiagnostic, MainDoeuvreModel, extractContent, CloudinaryUploadResult } from '../../shared/models';
import { PieceDetache } from '../../agent/pieces-detachees/models/piece-detachee.model';
import { MediaUploaderComponent } from '../../shared/components/media-uploader/media-uploader.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-technicien-ordre-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MediaUploaderComponent, SearchableSelectComponent],
  templateUrl: './technicien-ordre-detail.component.html',
})
export class TechnicienOrdreDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private service = inject(TechnicienPortalService);
  private pieceService = inject(PieceDetacheeService);
  private moService = inject(MainDoeuvreService);

  formatPiece = (p: any): string => {
    if (!p) return '';
    const ref = p.reference ? `[${p.reference}] ` : '';
    const des = p.designation || '';
    return `${ref}${des}`;
  };

  ordreId!: number;
  ordre: OrdreReparation | null = null;
  loading = true;
  errorMessage = '';
  successMessage = '';
  forbidden = false;

  allPieces: PieceDetache[] = [];
  allMO: MainDoeuvreModel[] = [];

  // Pannes détectées
  listeDefauts = '';
  savingPannes = false;

  // Diagnostic — pièces jointes
  piecesJointesDiagnostic: PieceJointeDiagnostic[] = [];
  pieceJointeRemarque = '';
  pieceJointeUploading = false;

  // Diagnostic — remarques
  remarquesDiagnostic: RemarqueDiagnostic[] = [];
  newRemarque = '';
  savingRemarque = false;

  // Pièce catalogue proposée (PDP uniquement avec ID)
  selectedPieceId: number | null = null;
  pieceQuantite = 1;
  savingPiece = false;

  // Pièce à saisir (PDS — pas d'ID catalogue)
  pdsDesignation = '';
  pdsQuantite = 1;
  savingPds = false;

  // Main d'œuvre proposée (sans prix)
  selectedMainDoeuvreId: number | null = null;
  moNbreHeure = 1;
  savingMainDoeuvre = false;

  ngOnInit() {
    this.ordreId = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      pieces: this.pieceService.getAll(),
      mo: this.moService.getAll(),
    }).subscribe({
      next: ({ pieces, mo }: { pieces: any; mo: any }) => {
        const pieceList = extractContent<PieceDetache>(pieces as any);
        // Catalogue : strictement PDP (les pièces avec ID en stock)
        this.allPieces = pieceList.filter(p => p.statut === 'ACTIF' && p.type === 'PDP');
        const moList = extractContent<MainDoeuvreModel>(mo as any);
        this.allMO = moList.filter((m: MainDoeuvreModel) => !m.isArchived);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement pieces/MO:', err);
      }
    });
    this.load();
  }

  load(silent = false) {
    if (!silent && !this.ordre) {
      this.loading = true;
    }
    this.service.getOrdreReparation(this.ordreId).subscribe({
      next: (o) => {
        this.ordre = o;
        this.listeDefauts = o.listeDefauts ?? '';
        this.loading = false;
        this.cdr.markForCheck();
        this.loadPiecesJointesDiagnostic();
        this.loadRemarquesDiagnostic();
      },
      error: (err) => {
        this.loading = false;
        this.cdr.markForCheck();
        if (err.status === 403) {
          this.forbidden = true;
        } else {
          this.errorMessage = "Impossible de charger cet ordre de réparation.";
        }
      },
    });
  }

  loadPiecesJointesDiagnostic() {
    this.service.getPiecesJointesDiagnostic(this.ordreId).subscribe({
      next: (list) => { this.piecesJointesDiagnostic = list; },
      error: () => { this.piecesJointesDiagnostic = []; },
    });
  }

  loadRemarquesDiagnostic() {
    this.service.getRemarquesDiagnostic(this.ordreId).subscribe({
      next: (list) => { this.remarquesDiagnostic = list; },
      error: () => { this.remarquesDiagnostic = []; },
    });
  }

  // ─── Remarques de diagnostic (Instantané) ───
  addRemarque() {
    if (!this.newRemarque.trim()) return;
    const contenu = this.newRemarque.trim();
    this.newRemarque = '';

    // Ajout optimiste immédiat
    const tempId = -Date.now();
    const tempRemarque: RemarqueDiagnostic = {
      id: tempId,
      contenu,
      createdAt: new Date().toISOString(),
      technicienNom: 'Moi'
    };
    this.remarquesDiagnostic = [tempRemarque, ...this.remarquesDiagnostic];
    this.cdr.markForCheck();

    this.service.addRemarqueDiagnostic(this.ordreId, contenu).subscribe({
      next: () => {
        this.notify('Remarque ajoutée.');
        this.loadRemarquesDiagnostic();
      },
      error: (err) => {
        // Rollback
        this.remarquesDiagnostic = this.remarquesDiagnostic.filter(r => r.id !== tempId);
        this.newRemarque = contenu;
        this.cdr.markForCheck();
        const msg = err.error?.message || (typeof err.error === 'string' ? err.error : '') || 'Erreur lors de l\'ajout de la remarque.';
        this.notifyError(msg);
      }
    });
  }

  removeRemarque(remarqueId: number) {
    if (!confirm('Supprimer cette remarque ?')) return;
    const prev = [...this.remarquesDiagnostic];
    this.remarquesDiagnostic = this.remarquesDiagnostic.filter(r => r.id !== remarqueId);
    this.cdr.markForCheck();

    this.service.deleteRemarqueDiagnostic(this.ordreId, remarqueId).subscribe({
      next: () => this.loadRemarquesDiagnostic(),
      error: (err) => {
        this.remarquesDiagnostic = prev;
        this.cdr.markForCheck();
        this.notifyError(err.error?.message || 'Erreur lors de la suppression de la remarque.');
      }
    });
  }

  savePannes() {
    this.savingPannes = true;
    this.service.updatePannes(this.ordreId, this.listeDefauts).subscribe({
      next: (o) => { this.ordre = o; this.savingPannes = false; this.notify('Pannes détectées enregistrées.'); },
      error: () => { this.savingPannes = false; this.notifyError('Erreur lors de l\'enregistrement des pannes.'); },
    });
  }

  onPieceJointeUploaded(result: CloudinaryUploadResult) {
    this.pieceJointeUploading = true;
    const type: TypePieceJointeDiagnostic = result.format === 'pdf' ? 'PDF' : 'PHOTO';
    this.service.addPieceJointeDiagnostic(this.ordreId, {
      url: result.secureUrl,
      type,
      remarque: this.pieceJointeRemarque ? this.pieceJointeRemarque : null,
    }).subscribe({
      next: (pj) => {
        this.piecesJointesDiagnostic.push(pj);
        this.pieceJointeRemarque = '';
        this.pieceJointeUploading = false;
        this.notify('Fichier ajouté au diagnostic.');
      },
      error: () => {
        this.pieceJointeUploading = false;
        this.notifyError('Erreur lors de l\'enregistrement du fichier.');
      },
    });
  }

  removePieceJointeDiagnostic(id: number) {
    if (!confirm('Supprimer cette pièce jointe ?')) return;
    const prev = [...this.piecesJointesDiagnostic];
    this.piecesJointesDiagnostic = this.piecesJointesDiagnostic.filter(p => p.id !== id);
    this.cdr.markForCheck();

    this.service.deletePieceJointeDiagnostic(this.ordreId, id).subscribe({
      next: () => {
        this.notify('Pièce jointe supprimée.');
      },
      error: () => {
        this.piecesJointesDiagnostic = prev;
        this.cdr.markForCheck();
        this.notifyError('Erreur lors de la suppression de la pièce jointe.');
      }
    });
  }

  deletePieceJointe(pj: PieceJointeDiagnostic) {
    this.removePieceJointeDiagnostic(pj.id);
  }

  get lignesPiecesGroupes(): any[] {
    const pieces = this.ordre?.lignesOrdreReparationPieces || [];
    const map = new Map<string, any>();

    for (const p of pieces) {
      const key = p.isCustom 
        ? `custom_${(p.designationPds || '').trim().toLowerCase()}`
        : `cat_${p.piece?.id}`;
      
      if (map.has(key)) {
        const item = map.get(key);
        item.quantite = (item.quantite || 0) + (p.quantite || 1);
        if (!item.ids) item.ids = [item.id];
        item.ids.push(p.id);
      } else {
        map.set(key, { ...p, quantite: p.quantite || 1, ids: [p.id] });
      }
    }

    return Array.from(map.values());
  }

  get lignesPiecesCatalogueGroupes(): any[] {
    return this.lignesPiecesGroupes.filter(p => !p.isCustom);
  }

  get lignesPiecesPdsGroupes(): any[] {
    return this.lignesPiecesGroupes.filter(p => !!p.isCustom);
  }

  get lignesMOGroupes(): any[] {
    const mos = this.ordre?.lignesOrdreReparationMainDoeuvres || [];
    const map = new Map<number, any>();

    for (const m of mos) {
      const key = m.mainDoeuvre?.id;
      if (!key) continue;

      if (map.has(key)) {
        const item = map.get(key);
        item.nbreHeure = (item.nbreHeure || 0) + (m.nbreHeure || 1);
        if (!item.ids) item.ids = [item.id];
        item.ids.push(m.id);
      } else {
        map.set(key, { ...m, nbreHeure: m.nbreHeure || 1, ids: [m.id] });
      }
    }

    return Array.from(map.values());
  }

  // ─── Proposer Pièce Catalogue PDP (Instantané avec ID) ───
  proposerPiece() {
    if (!this.selectedPieceId || this.pieceQuantite < 1) return;
    const pieceId = this.selectedPieceId;
    const quantite = this.pieceQuantite;
    const pieceObj = this.allPieces.find(p => p.id === pieceId);
    const piecePrix = pieceObj?.prix != null ? pieceObj.prix : 0;

    // Reset formulaire immédiatement
    this.selectedPieceId = null;
    this.pieceQuantite = 1;

    // Insertion optimiste immédiate dans la liste
    const tempId = -Date.now();
    const tempLigne: any = {
      id: tempId,
      quantite,
      isCustom: false,
      prix: piecePrix,
      piece: pieceObj ? { id: pieceObj.id, reference: pieceObj.reference, designation: pieceObj.designation, type: pieceObj.type, prix: piecePrix } : { id: pieceId }
    };
    if (this.ordre) {
      this.ordre.lignesOrdreReparationPieces = [...(this.ordre.lignesOrdreReparationPieces || []), tempLigne];
    }
    this.cdr.markForCheck();

    this.service.proposerPiece(this.ordreId, { pieceId, quantite, prix: piecePrix }).subscribe({
      next: () => {
        this.notify('Pièce catalogue proposée.');
        this.load(true);
      },
      error: (err) => {
        // Rollback
        if (this.ordre?.lignesOrdreReparationPieces) {
          this.ordre.lignesOrdreReparationPieces = this.ordre.lignesOrdreReparationPieces.filter((l: any) => l.id !== tempId);
          this.cdr.markForCheck();
        }
        this.notifyError(err.error?.message || 'Erreur lors de la proposition de la pièce.');
      }
    });
  }

  // ─── Proposer Pièce à Saisir PDS (Instantané — Sans ID catalogue) ───
  proposerPds() {
    if (!this.pdsDesignation.trim() || this.pdsQuantite < 1) return;
    const designation = this.pdsDesignation.trim();
    const quantite = this.pdsQuantite;

    // Reset formulaire immédiatement
    this.pdsDesignation = '';
    this.pdsQuantite = 1;

    // Ajout optimiste immédiat
    const tempId = -Date.now();
    const tempLigne: any = {
      id: tempId,
      quantite,
      isCustom: true,
      designationPds: designation,
      piece: null
    };
    if (this.ordre) {
      this.ordre.lignesOrdreReparationPieces = [...(this.ordre.lignesOrdreReparationPieces || []), tempLigne];
    }
    this.cdr.markForCheck();

    // PDS n'a pas d'ID catalogue : pieceId est null
    this.service.proposerPiece(this.ordreId, {
      pieceId: null,
      quantite,
      isCustom: true,
      designationPds: designation
    }).subscribe({
      next: () => {
        this.notify('Pièce à saisir (PDS) proposée.');
        this.load(true);
      },
      error: (err) => {
        // Rollback
        if (this.ordre?.lignesOrdreReparationPieces) {
          this.ordre.lignesOrdreReparationPieces = this.ordre.lignesOrdreReparationPieces.filter((l: any) => l.id !== tempId);
          this.pdsDesignation = designation;
          this.cdr.markForCheck();
        }
        this.notifyError(err.error?.message || 'Erreur lors de la proposition de la pièce PDS.');
      }
    });
  }

  // ─── Proposer Main-d'œuvre (Instantané) ───
  proposerMainDoeuvre() {
    if (!this.selectedMainDoeuvreId || this.moNbreHeure < 1) return;
    const moId = this.selectedMainDoeuvreId;
    const heures = this.moNbreHeure;
    const moObj = this.allMO.find(m => m.id === moId);
    const moPrix = moObj?.prix != null ? moObj.prix : 0;

    // Reset formulaire immédiatement
    this.selectedMainDoeuvreId = null;
    this.moNbreHeure = 1;

    // Ajout optimiste immédiat
    const tempId = -Date.now();
    const tempLigne: any = {
      id: tempId,
      nbreHeure: heures,
      prix: moPrix,
      mainDoeuvre: moObj ? { id: moObj.id, description: moObj.description, categorie: moObj.categorie, prix: moPrix } : { id: moId }
    };
    if (this.ordre) {
      this.ordre.lignesOrdreReparationMainDoeuvres = [...(this.ordre.lignesOrdreReparationMainDoeuvres || []), tempLigne];
    }
    this.cdr.markForCheck();

    this.service.proposerMainDoeuvre(this.ordreId, { mainDoeuvreId: moId, nbreHeure: heures, prix: moPrix }).subscribe({
      next: () => {
        this.notify('Main d\'œuvre proposée au chef d\'atelier.');
        this.load(true);
      },
      error: (err) => {
        // Rollback
        if (this.ordre?.lignesOrdreReparationMainDoeuvres) {
          this.ordre.lignesOrdreReparationMainDoeuvres = this.ordre.lignesOrdreReparationMainDoeuvres.filter((m: any) => m.id !== tempId);
          this.cdr.markForCheck();
        }
        this.notifyError(err.error?.message || 'Erreur lors de la proposition de main d\'œuvre.');
      }
    });
  }

  // ─── Suppression Pièce (Instantané) ───
  supprimerPiece(item: any) {
    if (!confirm('Voulez-vous retirer cette pièce ?')) return;
    const ids: number[] = item.ids || (item.id ? [item.id] : []);
    if (!ids || ids.length === 0) return;

    // Retrait optimiste immédiat
    const prevPieces = [...(this.ordre?.lignesOrdreReparationPieces || [])];
    if (this.ordre && this.ordre.lignesOrdreReparationPieces) {
      this.ordre.lignesOrdreReparationPieces = this.ordre.lignesOrdreReparationPieces.filter(
        (l: any) => !ids.includes(l.id)
      );
    }
    this.cdr.markForCheck();

    const realIds = ids.filter(id => id > 0);
    if (realIds.length === 0) return;

    forkJoin(realIds.map(id => this.service.supprimerPiece(this.ordreId, id))).subscribe({
      next: () => {
        this.notify('Pièce retirée.');
        this.load(true);
      },
      error: (err) => {
        if (this.ordre) {
          this.ordre.lignesOrdreReparationPieces = prevPieces;
          this.cdr.markForCheck();
        }
        this.notifyError(err.error?.message || 'Erreur lors de la suppression de la pièce.');
      }
    });
  }

  // ─── Suppression MO (Instantané) ───
  supprimerMainDoeuvre(item: any) {
    if (!confirm('Voulez-vous retirer cette main d\'œuvre ?')) return;
    const ids: number[] = item.ids || (item.id ? [item.id] : []);
    if (!ids || ids.length === 0) return;

    // Retrait optimiste immédiat
    const prevMO = [...(this.ordre?.lignesOrdreReparationMainDoeuvres || [])];
    if (this.ordre && this.ordre.lignesOrdreReparationMainDoeuvres) {
      this.ordre.lignesOrdreReparationMainDoeuvres = this.ordre.lignesOrdreReparationMainDoeuvres.filter(
        (m: any) => !ids.includes(m.id)
      );
    }
    this.cdr.markForCheck();

    const realIds = ids.filter(id => id > 0);
    if (realIds.length === 0) return;

    forkJoin(realIds.map(id => this.service.supprimerMainDoeuvre(this.ordreId, id))).subscribe({
      next: () => {
        this.notify('Main d\'œuvre retirée.');
        this.load(true);
      },
      error: (err) => {
        if (this.ordre) {
          this.ordre.lignesOrdreReparationMainDoeuvres = prevMO;
          this.cdr.markForCheck();
        }
        this.notifyError(err.error?.message || 'Erreur lors de la suppression de la main d\'œuvre.');
      }
    });
  }

  getPiecePrice(lp: any): number {
    if (lp?.prix != null && Number(lp.prix) > 0) return Number(lp.prix);
    if (lp?.piece?.prix != null && Number(lp.piece.prix) > 0) return Number(lp.piece.prix);
    const cat = this.allPieces.find(p => p.id === (lp?.piece?.id || lp?.pieceId));
    return cat?.prix ? Number(cat.prix) : 0;
  }

  getMOPrice(lm: any): number {
    if (lm?.prix != null && Number(lm.prix) > 0) return Number(lm.prix);
    if (lm?.mainDoeuvre?.prix != null && Number(lm.mainDoeuvre.prix) > 0) return Number(lm.mainDoeuvre.prix);
    const cat = this.allMO.find(m => m.id === (lm?.mainDoeuvre?.id || lm?.mainDoeuvreId));
    return cat?.prix ? Number(cat.prix) : 0;
  }

  private notify(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
