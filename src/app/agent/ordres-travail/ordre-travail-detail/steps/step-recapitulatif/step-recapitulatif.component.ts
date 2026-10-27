import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrdreTravailService } from '../../../ordre-travail.service';
import { StepRecapitulatifResponseDto, StatutOrdreTravail, PieceApprovisionnementDto } from '../../../models/ordre-travail.model';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import { OrdreReparationService } from '../../../../ordres-reparation/ordre-reparation.service';
import { DiagnosticService } from '../../../../diagnostics/diagnostic.service';
import { FicheAtelierService } from '../../../../fiches-atelier/fiche-atelier.service';
import { FicheAtelierDetailsResponse } from '../../../../fiches-atelier/models/fiche-atelier.model';
import { OrdreReparation } from '../../../../ordres-reparation/models/ordre-reparation.model';
import { StepReceptionResponseDto } from '../../../../ordres-reparation/models/responses/step-reception-response.dto';
import { StepDiagnosticResponseDto } from '../../../../ordres-reparation/models/responses/step-diagnostic-response.dto';
import { DiagnosticResponse, PieceJointeDiagnostic, RemarqueDiagnostic } from '../../../../diagnostics/models/diagnostic.model';

@Component({
  selector: 'app-step-recapitulatif',
  standalone: true,
  imports: [CommonModule, AlertComponent, DatePipe],
  templateUrl: './step-recapitulatif.component.html',
  styleUrls: ['./step-recapitulatif.component.css']
})
export class StepRecapitulatifComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private otService = inject(OrdreTravailService);
  private ordreReparationService = inject(OrdreReparationService);
  private diagnosticService = inject(DiagnosticService);
  private ficheAtelierService = inject(FicheAtelierService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  otId!: number;
  data: StepRecapitulatifResponseDto | null = null;
  loading = true;
  advancing = false;
  errorMessage = '';
  successMessage = '';

  // Données issues de l'Ordre de Réparation lié & Fiche Atelier
  ordreReparation: OrdreReparation | null = null;
  stepReception: StepReceptionResponseDto | null = null;
  ficheAtelier: FicheAtelierDetailsResponse | null = null;
  stepDiagnostic: StepDiagnosticResponseDto | null = null;
  diagnosticFromService: DiagnosticResponse | null = null;
  loadingOrData = false;

  // Prévisualisation document (Lightbox modal)
  selectedDocPreview: PieceJointeDiagnostic | null = null;
  autoPrint = false;

  // Modal de confirmation en cas de pièces manquantes (rupture)
  showRuptureConfirmModal = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/app/ordres-travail']);
      return;
    }
    this.otId = +idParam;

    if (this.route.snapshot.queryParamMap.get('print') === 'true') {
      this.autoPrint = true;
    }

    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.otService.getStepRecapitulatif(this.otId).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
        this.loadOrdreReparationData(res);
        this.cdr.markForCheck();

        if (this.autoPrint) {
          setTimeout(() => {
            this.imprimer();
          }, 600);
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement du récapitulatif.';
        this.cdr.markForCheck();
      }
    });
  }

  loadOrdreReparationData(res: StepRecapitulatifResponseDto): void {
    // Si l'OR est déjà embarqué dans la réponse
    if ((res as any)?.ordreReparation && typeof (res as any).ordreReparation === 'object') {
      this.ordreReparation = (res as any).ordreReparation;
      if (this.ordreReparation?.ficheAtelier) {
        this.ficheAtelier = this.ordreReparation.ficheAtelier;
      }
    }

    const orId = res.ordreReparationId || (res as any)?.ordreReparation?.id;
    if (orId) {
      this.fetchOrDetails(orId);
    } else {
      // Fallback: chercher dans le summary de l'OT si l'ID n'était pas dans le step-recapitulatif
      this.otService.getSummary(this.otId).subscribe({
        next: (ot) => {
          const fallbackOrId = ot.ordreReparationId || (ot as any)?.ordreReparation?.id;
          if (fallbackOrId) {
            this.fetchOrDetails(fallbackOrId);
          }
        }
      });
    }
  }

  fetchOrDetails(orId: number): void {
    this.loadingOrData = true;

    // 1. Récupération de l'OR complet (travaux demandés, défauts constatés, fiche atelier)
    this.ordreReparationService.getById(orId).pipe(catchError(() => of(null))).subscribe({
      next: (ordre) => {
        if (ordre) {
          this.ordreReparation = ordre;
          if (ordre.ficheAtelier) {
            this.ficheAtelier = ordre.ficheAtelier;
          }
          const faId = (ordre as any).ficheAtelierId || ordre.ficheAtelier?.id;
          if (faId && !this.ficheAtelier) {
            this.fetchFicheAtelier(faId);
          }
        }
        this.loadingOrData = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingOrData = false;
        this.cdr.markForCheck();
      }
    });

    // 2. Récupération du Step 1 (Réception) de l'OR (qui contient descriptionTravaux, ficheAtelier, lignesTravaux...)
    this.ordreReparationService.getStepReception(orId).pipe(catchError(() => of(null))).subscribe({
      next: (stepRec) => {
        if (stepRec) {
          this.stepReception = stepRec;
          if (stepRec.ficheAtelier) {
            this.ficheAtelier = stepRec.ficheAtelier;
          }
          const faId = stepRec.ficheAtelierId || (stepRec as any).ficheAtelier?.id;
          if (faId && !this.ficheAtelier) {
            this.fetchFicheAtelier(faId);
          }
          this.cdr.markForCheck();
        }
      }
    });

    // 3. Récupération du diagnostic de l'OR (remarques techniciens, documents et photos)
    this.ordreReparationService.getStepDiagnostic(orId).pipe(catchError(() => of(null))).subscribe({
      next: (diagDto) => {
        if (diagDto) {
          this.stepDiagnostic = diagDto;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        // Fallback avec le diagnosticService direct
        this.diagnosticService.getByOrdreReparationId(orId).pipe(catchError(() => of(null))).subscribe({
          next: (diagResp) => {
            if (diagResp) {
              this.diagnosticFromService = diagResp;
              this.cdr.markForCheck();
            }
          }
        });
      }
    });

    // Sécurité : si aucune fiche atelier n'est chargée après 350ms, essayer de la charger avec orId
    setTimeout(() => {
      if (!this.ficheAtelier && orId) {
        this.fetchFicheAtelier(orId);
      }
    }, 350);
  }

  fetchFicheAtelier(faId: number): void {
    if (!faId) return;
    this.ficheAtelierService.getById(faId).pipe(catchError(() => of(null))).subscribe({
      next: (fa) => {
        if (fa) {
          this.ficheAtelier = fa;
          this.cdr.markForCheck();
        }
      }
    });
  }

  // ─── Getters pour les Travaux demandés (issus de l'OR & Fiche Atelier) ───

  get descriptionTravaux(): string {
    return this.stepReception?.descriptionTravaux ||
      this.ordreReparation?.descriptionTravaux ||
      this.ficheAtelier?.designationTravaux ||
      (this.ordreReparation?.ficheAtelier as any)?.designationTravaux ||
      (this.ordreReparation?.ficheAtelier as any)?.travauxDemandes ||
      (this.ficheAtelier as any)?.travauxDemandes ||
      (this.data as any)?.descriptionTravaux ||
      (this.data as any)?.designationTravaux ||
      '';
  }

  get travauxDemandesList(): { nom: string; verrouille?: boolean }[] {
    const list = this.stepReception?.lignesTravaux ||
      this.ordreReparation?.lignesTravaux ||
      (this.ordreReparation?.ficheAtelier as any)?.lignesTravaux ||
      (this.ficheAtelier as any)?.lignesTravaux ||
      (this.data as any)?.lignesTravaux ||
      (this.data as any)?.travauxDemandes;

    if (Array.isArray(list) && list.length > 0) {
      return list.map(item => typeof item === 'string' ? { nom: item } : item);
    }

    const desc = this.descriptionTravaux;
    if (desc && desc.includes('\n')) {
      return desc.split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(nom => ({ nom }));
    }

    if (desc && desc.trim().length > 0) {
      return [{ nom: desc.trim() }];
    }

    return [];
  }

  get hasSingleTravailMatchingDescription(): boolean {
    if (this.travauxDemandesList.length === 1 && this.descriptionTravaux) {
      return this.travauxDemandesList[0].nom.trim().toLowerCase() === this.descriptionTravaux.trim().toLowerCase();
    }
    return false;
  }

  get hasTravauxDemandes(): boolean {
    return this.travauxDemandesList.length > 0 || !!(this.descriptionTravaux && this.descriptionTravaux.trim());
  }

  // ─── Getters pour les Défauts constatés (issus de l'OR & Fiche Atelier) ───

  get defautsConstatesList(): any[] {
    const rawList = this.stepReception?.lignesDefauts ||
      this.ordreReparation?.lignesDefauts ||
      this.ficheAtelier?.lignesDefauts ||
      this.ficheAtelier?.defautsConstates ||
      (this.ordreReparation?.ficheAtelier as any)?.lignesDefauts ||
      (this.ficheAtelier as any)?.defautsConstates ||
      (this.data as any)?.lignesDefauts ||
      (this.data as any)?.defautsConstates;

    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList.filter((d: any) => {
        if (!d) return false;
        if (d.present === true || d.present === 'true') return true;
        if (d.present === false || d.present === 'false') return false;
        return !!(d.designation && d.designation.trim());
      });
    }
    return [];
  }

  get texteDefautsConstates(): string {
    return this.ficheAtelier?.nb ||
      this.stepReception?.listeDefauts ||
      this.ordreReparation?.listeDefauts ||
      this.stepDiagnostic?.listeDefauts ||
      (this.ordreReparation?.ficheAtelier as any)?.listeDefauts ||
      (this.ficheAtelier as any)?.listeDefauts ||
      (this.data as any)?.listeDefauts ||
      '';
  }

  get hasDefautsConstates(): boolean {
    return this.defautsConstatesList.length > 0 || !!(this.texteDefautsConstates && this.texteDefautsConstates.trim());
  }

  // ─── Getters pour l'État des lieux & Réception atelier ─────────────

  get lignesReceptionList(): any[] {
    const raw = this.stepReception?.lignesReception ||
      this.ordreReparation?.lignesReception ||
      this.ficheAtelier?.lignesReception ||
      this.ficheAtelier?.reception ||
      (this.ordreReparation?.ficheAtelier as any)?.lignesReception ||
      (this.data as any)?.lignesReception;
    return Array.isArray(raw) ? raw : [];
  }

  get hasFicheAtelierData(): boolean {
    return !!(this.ficheAtelier || this.lignesReceptionList.length > 0);
  }

  // ─── Getters pour les Remarques & Observations Diagnostic ─────────

  get remarquesDiagnosticList(): RemarqueDiagnostic[] {
    const list = this.stepDiagnostic?.diagnostic?.remarques ||
      this.ordreReparation?.diagnostic?.remarques ||
      this.diagnosticFromService?.remarques ||
      (this.data as any)?.remarquesDiagnostic;
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
    return [];
  }

  get pannesDetectees(): string {
    return this.stepDiagnostic?.diagnostic?.pannesDetectees ||
      this.ordreReparation?.diagnostic?.pannesDetectees ||
      this.diagnosticFromService?.pannesDetectees ||
      (this.data as any)?.pannesDetectees ||
      '';
  }

  get observationsDiagnostic(): string {
    return this.ordreReparation?.diagnostic?.observations ||
      this.diagnosticFromService?.observations ||
      (this.data as any)?.observationsDiagnostic ||
      '';
  }

  get recommandationsDiagnostic(): string {
    return this.ordreReparation?.diagnostic?.recommandations ||
      this.diagnosticFromService?.recommandations ||
      (this.data as any)?.recommandationsDiagnostic ||
      '';
  }

  get hasDiagnosticInfo(): boolean {
    return this.remarquesDiagnosticList.length > 0 ||
      !!(this.pannesDetectees && this.pannesDetectees.trim()) ||
      !!(this.observationsDiagnostic && this.observationsDiagnostic.trim()) ||
      !!(this.recommandationsDiagnostic && this.recommandationsDiagnostic.trim());
  }

  // ─── Getters pour les Documents du diagnostic ───────────────────

  get piecesJointesDiagnostic(): PieceJointeDiagnostic[] {
    const list = this.stepDiagnostic?.diagnostic?.piecesJointes ||
      this.ordreReparation?.diagnostic?.piecesJointes ||
      this.diagnosticFromService?.piecesJointes ||
      (this.data as any)?.piecesJointesDiagnostic;
    if (Array.isArray(list) && list.length > 0) {
      return list;
    }
    return [];
  }

  get hasDocsDiagnostic(): boolean {
    return this.piecesJointesDiagnostic.length > 0;
  }

  // ─── Visualiseur / Modal Document ───────────────────────────────

  openDocPreview(doc: PieceJointeDiagnostic): void {
    this.selectedDocPreview = doc;
    this.cdr.markForCheck();
  }

  closeDocPreview(): void {
    this.selectedDocPreview = null;
    this.cdr.markForCheck();
  }

  isImageDoc(doc?: PieceJointeDiagnostic | null): boolean {
    if (!doc) return false;
    if (doc.type === 'PHOTO') return true;
    const url = (doc.url || '').toLowerCase();
    return url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.webp') || url.endsWith('.gif');
  }

  // ─── Impression de l'Ordre de Travail ───────────────────────────

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  imprimer(): void {
    window.print();
  }

  get dateImpression(): Date {
    return new Date();
  }

  get orNumeroDisplay(): string {
    return this.data?.ordreReparationNumero ||
      this.ordreReparation?.numero ||
      (this.data?.ordreReparationId ? `OR #${this.data.ordreReparationId}` : '—');
  }

  // ─── Navigation et helpers existants ────────────────────────────

  continuerVersBonSortie(): void {
    if (this.hasPiecesManquantes) {
      this.showRuptureConfirmModal = true;
      this.cdr.markForCheck();
      return;
    }
    this.confirmerEtPasserAuBonSortie();
  }

  confirmerEtPasserAuBonSortie(): void {
    this.showRuptureConfirmModal = false;
    this.advancing = true;
    if (this.data?.statut === StatutOrdreTravail.RECAPITULATIF) {
      this.otService.updateStatut(this.otId, StatutOrdreTravail.BON_DE_SORTIE).subscribe({
        next: () => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-travail', this.otId, 'bon-sortie']);
        },
        error: () => {
          this.advancing = false;
          this.router.navigate(['/app/ordres-travail', this.otId, 'bon-sortie']);
        }
      });
    } else {
      this.advancing = false;
      this.router.navigate(['/app/ordres-travail', this.otId, 'bon-sortie']);
    }
  }

  annulerRuptureModal(): void {
    this.showRuptureConfirmModal = false;
    this.cdr.markForCheck();
  }

  continuerVersApprovisionnement(): void {
    this.continuerVersBonSortie();
  }

  getClientNom(): string {
    if (!this.data) return 'Non renseigné';
    const c: any = this.data.client || (this.data as any).clientNom;
    if (!c) return (this.data as any).clientNom || 'Non renseigné';
    if (typeof c === 'string') return c !== 'undefined undefined' ? c : 'Non renseigné';
    if (c.clientNom && c.clientNom !== 'undefined undefined') return c.clientNom;
    if (c.fullName && c.fullName !== 'undefined undefined') return c.fullName;
    if (c.name && c.name !== 'undefined undefined') return c.name;

    const fn = (c.firstName || c.prenom || '').toString().trim();
    const ln = (c.lastName || c.nom || '').toString().trim();
    const full = `${fn} ${ln}`.trim();
    if (full && full !== 'undefined undefined' && full !== 'undefined') return full;

    return (this.data as any).clientNom || c.phone || c.email || 'Non renseigné';
  }

  getClientPhone(): string {
    if (!this.data) return 'Non renseigné';
    const c: any = this.data.client;
    return c?.phone || c?.telephone || (this.data as any).clientPhone || 'Non renseigné';
  }

  get piecesManquantes(): PieceApprovisionnementDto[] {
    return (this.data?.piecesManquantesProforma || []).filter(
      p => (p.quantiteManquante && p.quantiteManquante > 0) || p.isManquant
    );
  }

  get hasPiecesManquantes(): boolean {
    return this.piecesManquantes.length > 0;
  }

  get totalPiecesManquantes(): number {
    return this.piecesManquantes.reduce((sum, p) => sum + (p.quantiteManquante || 0), 0);
  }

  get totalMontantManquant(): number {
    return this.piecesManquantes.reduce(
      (sum, p) => sum + ((p.prixUnitaire || 0) * (p.quantiteManquante || 0)),
      0
    );
  }

  getPieceManquante(ligneId?: number): PieceApprovisionnementDto | undefined {
    if (!ligneId) return undefined;
    return this.piecesManquantes.find(p => p.ligneId === ligneId);
  }

  get lignesMainDoeuvreList(): any[] {
    return this.data?.proforma?.lignesMainDoeuvre || (this.data?.proforma as any)?.lignesMainDoeuvres || [];
  }
}
