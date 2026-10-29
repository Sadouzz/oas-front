import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { DiagnosticService } from '../../../../diagnostics/diagnostic.service';
import { FicheAtelierService } from '../../../../fiches-atelier/fiche-atelier.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import {
  OrdreReparation,
  LigneReceptionOrdre,
  StepReceptionDto
} from '../../../../../shared/models';
import { StepReceptionResponseDto } from '../../../models/responses/step-reception-response.dto';
import {
  FicheAtelierDetailsResponse,
  FicheAtelierRequest,
  LigneDefaut,
  LigneReception
} from '../../../../fiches-atelier/models/fiche-atelier.model';

@Component({
  selector: 'app-step-reception',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, AlertComponent],
  templateUrl: './step-reception.component.html'
})
export class StepReceptionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private diagnosticService = inject(DiagnosticService);
  private ficheAtelierService = inject(FicheAtelierService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: StepReceptionResponseDto | null = null;
  fullOrdre: OrdreReparation | null = null;
  ficheAtelier: FicheAtelierDetailsResponse | null = null;
  selectedVehicule: any = null;

  lignesDefauts: LigneDefaut[] = [];

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  step1Form: FormGroup = this.fb.group({
    numero: [''],
    lignesReception: this.fb.array([]),
    descriptionTravaux: [''],
  });

  get lignesReception(): FormArray {
    return this.step1Form.get('lignesReception') as FormArray;
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
      step: this.ordreService.getStepReception(this.ordreId),
      ordre: this.ordreService.getById(this.ordreId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ step, ordre }) => {
        this.loadedOrdre = step;
        this.fullOrdre = ordre;
        this.selectedVehicule = step.vehicule || ordre?.vehicule || null;

        const ficheDirect = step.ficheAtelier || ordre?.ficheAtelier;
        const initialDesc = step.descriptionTravaux || ordre?.descriptionTravaux || ficheDirect?.designationTravaux || '';

        this.step1Form.patchValue({
          numero: step.numero || ordre?.numero || '',
          descriptionTravaux: initialDesc,
        });

        // 1. Lignes de réception
        const initialLignesRec = (step.lignesReception && step.lignesReception.length > 0)
          ? step.lignesReception
          : (ordre?.lignesReception && ordre.lignesReception.length > 0 ? ordre.lignesReception : []);

        this.setLignesReception(initialLignesRec);

        // 2. Recherche et chargement de la Fiche Atelier liée
        const ficheId = step.ficheAtelierId || (ordre as any)?.ficheAtelierId || ficheDirect?.id;

        if (ficheDirect) {
          this.ficheAtelier = ficheDirect;
          if (!this.step1Form.get('descriptionTravaux')?.value && ficheDirect.designationTravaux) {
            this.step1Form.patchValue({ descriptionTravaux: ficheDirect.designationTravaux });
          }
          this.initDefautsAndComplementaryData(ficheDirect, step, ordre);
          this.loading = false;
          this.cdr.markForCheck();
        } else if (ficheId) {
          this.ficheAtelierService.getById(ficheId).pipe(catchError(() => of(null))).subscribe({
            next: (fiche) => {
              this.ficheAtelier = fiche;
              if (fiche?.designationTravaux && !this.step1Form.get('descriptionTravaux')?.value) {
                this.step1Form.patchValue({ descriptionTravaux: fiche.designationTravaux });
              }
              this.initDefautsAndComplementaryData(fiche, step, ordre);
              this.loading = false;
              this.cdr.markForCheck();
            },
            error: () => {
              this.initDefautsAndComplementaryData(null, step, ordre);
              this.loading = false;
              this.cdr.markForCheck();
            }
          });
        } else {
          this.initDefautsAndComplementaryData(null, step, ordre);
          this.loading = false;
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de l\'ordre.';
        this.cdr.markForCheck();
      }
    });
  }

  notesFicheAtelier = '';

  private initDefautsAndComplementaryData(
    fiche: FicheAtelierDetailsResponse | null,
    step: StepReceptionResponseDto,
    ordre: OrdreReparation | null
  ): void {
    // Si lignesReception est vide dans l'ordre mais présent sur la fiche atelier
    if (this.lignesReception.length === 0 && fiche?.lignesReception && fiche.lignesReception.length > 0) {
      this.setLignesReception(fiche.lignesReception.map(l => ({
        nom: l.nom,
        etat: l.etat,
        verrouille: false
      })));
    }

    // Récupération et normalisation des défauts constatés
    let rawDefauts: LigneDefaut[] = [];
    if (fiche?.lignesDefauts && fiche.lignesDefauts.length > 0) {
      rawDefauts = fiche.lignesDefauts;
    } else if ((fiche as any)?.defautsConstates && (fiche as any).defautsConstates.length > 0) {
      rawDefauts = (fiche as any).defautsConstates;
    } else if (step.lignesDefauts && step.lignesDefauts.length > 0) {
      rawDefauts = step.lignesDefauts;
    } else if (ordre?.lignesDefauts && ordre.lignesDefauts.length > 0) {
      rawDefauts = ordre.lignesDefauts;
    }

    const defautsMap = new Map<string, LigneDefaut>();
    rawDefauts.forEach(d => {
      if (!d.nom) return;
      defautsMap.set(d.nom.toLowerCase(), {
        nom: d.nom,
        present: !!d.present,
        designation: d.designation || d.description || ''
      });
    });
    this.lignesDefauts = Array.from(defautsMap.values());

    this.notesFicheAtelier = fiche?.nb || '';

    if (fiche?.designationTravaux && !this.step1Form.get('descriptionTravaux')?.value) {
      this.step1Form.patchValue({ descriptionTravaux: fiche.designationTravaux });
    }

    // Si on a des informations complémentaires de la fiche atelier (kilométrage, etc.)
    if (fiche && this.selectedVehicule) {
      if (fiche.kilometrage && !this.selectedVehicule.kilometrage) {
        this.selectedVehicule.kilometrage = fiche.kilometrage;
      }
    }

    this.takeSnapshot();
  }

  initialSnapshot: string = '';

  takeSnapshot(): void {
    this.initialSnapshot = this.getCurrentSnapshot();
    this.cdr.markForCheck();
  }

  get hasChanges(): boolean {
    if (!this.initialSnapshot) return false;
    return this.getCurrentSnapshot() !== this.initialSnapshot;
  }

  private getCurrentSnapshot(): string {
    const raw = this.step1Form.getRawValue();
    return JSON.stringify({
      descriptionTravaux: (raw.descriptionTravaux || '').trim(),
      notesFicheAtelier: (this.notesFicheAtelier || '').trim()
    });
  }

  private buildLigneReceptionGroup(l: LigneReceptionOrdre | LigneReception) {
    return this.fb.group({
      nom: [l.nom || '', Validators.required],
      etat: [l.etat ?? null],
      verrouille: [false],
    });
  }

  private setLignesReception(lignes: (LigneReceptionOrdre | LigneReception)[] | null | undefined) {
    this.lignesReception.clear();
    (lignes || []).forEach(l => this.lignesReception.push(this.buildLigneReceptionGroup(l)));
  }

  validateStep(): void {
    this.saveStep1(true);
  }

  saveStep1(goToNext: boolean = false): void {
    const raw = this.step1Form.getRawValue();
    const descriptionTravaux = (raw.descriptionTravaux || '').trim();

    const ordrePayload: StepReceptionDto = {
      descriptionTravaux
    };

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    // 1. Sauvegarde de l'étape 1 sur l'Ordre de Réparation
    this.ordreService.updateStepReception(this.ordreId, ordrePayload).subscribe({
      next: () => {
        // 2. Synchronisation de la Fiche Atelier liée
        const ficheId = this.ficheAtelier?.id || this.loadedOrdre?.ficheAtelierId || (this.fullOrdre as any)?.ficheAtelierId;
        if (ficheId && this.ficheAtelier) {
          const ficheReq: FicheAtelierRequest = {
            rendezVousId: this.ficheAtelier.rendezVousId ?? null,
            clientId: this.ficheAtelier.clientId || this.selectedVehicule?.clientId || 0,
            vehiculeId: this.ficheAtelier.vehiculeId,
            nomChauffeur: this.ficheAtelier.nomChauffeur,
            telephoneChauffeur: this.ficheAtelier.telephoneChauffeur,
            niveauEssence: this.ficheAtelier.niveauEssence,
            kilometrage: this.selectedVehicule?.kilometrage || this.ficheAtelier.kilometrage,
            designationTravaux: descriptionTravaux,
            nb: (this.notesFicheAtelier || '').trim(),
            signatureReceptionnaireBase64: this.ficheAtelier.signatureReceptionnaireBase64,
            signatureBase64: this.ficheAtelier.signatureBase64,
            signatureSortieBase64: this.ficheAtelier.signatureSortieBase64
          };

          this.ficheAtelierService.update(ficheId, ficheReq).pipe(
            catchError((err) => {
              console.warn('Erreur synchronisation Fiche Atelier:', err);
              return of(null);
            })
          ).subscribe({
            next: (updatedFiche) => {
              if (updatedFiche) {
                this.ficheAtelier = updatedFiche;
              }
            }
          });
        }

        if (goToNext) {
          this.ordreService.updateStatut(this.ordreId, 'DIAGNOSTIC').subscribe({
            next: () => {},
            error: () => {}
          });

          this.diagnosticService.create({
            ordreReparationId: this.ordreId,
            statut: 'EN_ATTENTE',
            pannesDetectees: descriptionTravaux
          }).subscribe({
            next: () => {
              this.saving = false;
              this.router.navigate(['/app/ordres-reparation', this.ordreId, 'diagnostic']);
            },
            error: () => {
              this.diagnosticService.saveStep({
                ordreReparationId: this.ordreId,
                statut: 'EN_ATTENTE',
                listeDefauts: descriptionTravaux
              }).subscribe({ next: () => {}, error: () => {} });
              this.saving = false;
              this.router.navigate(['/app/ordres-reparation', this.ordreId, 'diagnostic']);
            }
          });
        } else {
          this.saving = false;
          this.takeSnapshot();
          this.step1Form.markAsPristine();
          this.successMessage = 'Étape 1 et Fiche Atelier mises à jour avec succès !';
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la sauvegarde.';
        this.cdr.markForCheck();
      }
    });
  }
}

