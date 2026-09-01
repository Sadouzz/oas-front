import { Component, inject, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TechnicienPortalService } from '../services/technicien-portal.service';
import { PieceDetacheeService, PieceDetache } from '../../services/piece-detachee.service';
import { MainDoeuvreService, MainDoeuvreModel } from '../../services/main-doeuvre.service';
import { MediaUploaderComponent } from '../../shared/components/media-uploader/media-uploader.component';
import { OrdreReparation, PieceJointeDiagnostic, TypePieceJointeDiagnostic, CloudinaryUploadResult } from '../../shared/models';
import { RemarqueDiagnostic } from '../../shared/models/ordre-reparation.model';

@Component({
  selector: 'app-technicien-ordre-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, MediaUploaderComponent],
  templateUrl: './technicien-ordre-detail.component.html',
})
export class TechnicienOrdreDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(TechnicienPortalService);
  private pieceService = inject(PieceDetacheeService);
  private moService = inject(MainDoeuvreService);

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

  // Pièce proposée (sans prix)
  selectedPieceId: number | null = null;
  pieceQuantite = 1;
  savingPiece = false;

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
      next: ({ pieces, mo }) => {
        this.allPieces = pieces.filter(p => p.statut === 'ACTIF');
        this.allMO = mo.filter(m => !m.isArchived);
      },
    });
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getOrdreReparation(this.ordreId).subscribe({
      next: (o) => {
        this.ordre = o;
        this.listeDefauts = o.listeDefauts ?? '';
        this.loading = false;
        this.loadPiecesJointesDiagnostic();
        this.loadRemarquesDiagnostic();
      },
      error: (err) => {
        this.loading = false;
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

  addRemarque() {
    if (!this.newRemarque.trim()) return;
    this.savingRemarque = true;
    this.service.addRemarqueDiagnostic(this.ordreId, this.newRemarque.trim()).subscribe({
      next: () => {
        this.savingRemarque = false;
        this.newRemarque = '';
        this.notify('Remarque ajoutée.');
        this.loadRemarquesDiagnostic();
      },
      error: (err) => {
        this.savingRemarque = false;
        this.notifyError(err.error?.message || 'Erreur lors de l\'ajout de la remarque.');
      },
    });
  }

  removeRemarque(remarqueId: number) {
    if (!confirm('Supprimer cette remarque ?')) return;
    this.service.deleteRemarqueDiagnostic(this.ordreId, remarqueId).subscribe({
      next: () => this.loadRemarquesDiagnostic(),
      error: () => this.notifyError('Erreur lors de la suppression de la remarque.'),
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
    const type: TypePieceJointeDiagnostic = (result.format === 'pdf' || result.resourceType === 'raw') ? 'PDF' : 'PHOTO';
    this.pieceJointeUploading = true;
    this.service.addPieceJointeDiagnostic(this.ordreId, {
      url: result.secureUrl,
      type,
      remarque: this.pieceJointeRemarque.trim() || null,
    }).subscribe({
      next: () => {
        this.pieceJointeUploading = false;
        this.pieceJointeRemarque = '';
        this.notify('Pièce jointe de diagnostic ajoutée.');
        this.loadPiecesJointesDiagnostic();
      },
      error: (err) => {
        this.pieceJointeUploading = false;
        this.notifyError(err.error?.message || "Erreur lors de l'enregistrement de la pièce jointe.");
      },
    });
  }

  removePieceJointeDiagnostic(pieceJointeId: number) {
    if (!confirm('Supprimer cette pièce jointe de diagnostic ?')) return;
    this.service.deletePieceJointeDiagnostic(this.ordreId, pieceJointeId).subscribe({
      next: () => this.loadPiecesJointesDiagnostic(),
      error: () => this.notifyError('Erreur lors de la suppression de la pièce jointe.'),
    });
  }

  proposerPiece() {
    if (!this.selectedPieceId || this.pieceQuantite < 1) return;
    this.savingPiece = true;
    this.service.proposerPiece(this.ordreId, { pieceId: this.selectedPieceId, quantite: this.pieceQuantite }).subscribe({
      next: () => {
        this.savingPiece = false;
        this.selectedPieceId = null;
        this.pieceQuantite = 1;
        this.notify('Pièce proposée. Le prix sera défini par le chef d\'atelier.');
        this.load();
      },
      error: (err) => { this.savingPiece = false; this.notifyError(err.error?.message || 'Erreur lors de la proposition de pièce.'); },
    });
  }

  proposerMainDoeuvre() {
    if (!this.selectedMainDoeuvreId || this.moNbreHeure < 1) return;
    this.savingMainDoeuvre = true;
    this.service.proposerMainDoeuvre(this.ordreId, { mainDoeuvreId: this.selectedMainDoeuvreId, nbreHeure: this.moNbreHeure }).subscribe({
      next: () => {
        this.savingMainDoeuvre = false;
        this.selectedMainDoeuvreId = null;
        this.moNbreHeure = 1;
        this.notify('Main d\'œuvre proposée. Le prix sera défini par le chef d\'atelier.');
        this.load();
      },
      error: (err) => { this.savingMainDoeuvre = false; this.notifyError(err.error?.message || 'Erreur lors de la proposition de main d\'œuvre.'); },
    });
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
