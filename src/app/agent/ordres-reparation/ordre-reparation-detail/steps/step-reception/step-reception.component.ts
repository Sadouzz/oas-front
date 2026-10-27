import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { DiagnosticService } from '../../../../diagnostics/diagnostic.service';
import { VehiculeService } from '../../../../vehicules/vehicule.service';
import { FicheAtelierService } from '../../../../fiches-atelier/fiche-atelier.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import {
  OrdreReparation,
  VehiculeModel,
  LigneReceptionOrdre,
  LigneTravailOrdre,
  StatutOrdre,
  StepReceptionDto
} from '../../../../../shared/models';
import { StepReceptionResponseDto } from '../../../models/responses/step-reception-response.dto';
import {
  FicheAtelierDetailsResponse,
  FicheAtelierRequest,
  LigneDefaut,
  LigneReception,
  DEFAULT_LIGNES_RECEPTION,
  DEFAULT_RUBRIQUES_DEFAUTS
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
  private vehiculeService = inject(VehiculeService);
  private ficheAtelierService = inject(FicheAtelierService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: StepReceptionResponseDto | null = null;
  fullOrdre: OrdreReparation | null = null;
  ficheAtelier: FicheAtelierDetailsResponse | null = null;
  selectedVehicule: any = null;

  lignesDefauts: LigneDefaut[] = [];
  listeDefautsText = '';

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  step1Form: FormGroup = this.fb.group({
    numero: [''],
    vehiculeId: [null, Validators.required],
    lignesReception: this.fb.array([]),
    lignesTravaux: this.fb.array([]),
    descriptionTravaux: [''],
  });

  get lignesReception(): FormArray {
    return this.step1Form.get('lignesReception') as FormArray;
  }

  get lignesTravaux(): FormArray {
    return this.step1Form.get('lignesTravaux') as FormArray;
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
          vehiculeId: step.vehiculeId ?? step.vehicule?.id ?? ordre?.vehicule?.id ?? null,
          descriptionTravaux: initialDesc,
        });

        // 1. Lignes de réception
        const initialLignesRec = (step.lignesReception && step.lignesReception.length > 0)
          ? step.lignesReception
          : (ordre?.lignesReception && ordre.lignesReception.length > 0 ? ordre.lignesReception : []);

        this.setLignesReception(initialLignesRec);
        this.setLignesTravaux(step.lignesTravaux || ordre?.lignesTravaux || []);

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
  nouveauDefautNom = '';

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
    } else if (this.lignesReception.length === 0) {
      this.setLignesReception(DEFAULT_LIGNES_RECEPTION.map(nom => ({ nom, etat: null, verrouille: false })));
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
    DEFAULT_RUBRIQUES_DEFAUTS.forEach(nom => {
      defautsMap.set(nom.toLowerCase(), { nom, present: false, designation: '' });
    });
    rawDefauts.forEach(d => {
      if (!d.nom) return;
      defautsMap.set(d.nom.toLowerCase(), {
        nom: d.nom,
        present: !!d.present,
        designation: d.designation || d.description || ''
      });
    });
    this.lignesDefauts = Array.from(defautsMap.values());

    this.listeDefautsText = step.listeDefauts || ordre?.listeDefauts || '';
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
    const defauts = (this.lignesDefauts || []).map(d => ({
      nom: (d.nom || '').trim(),
      present: !!d.present,
      designation: (d.designation || '').trim()
    }));
    const rec = (this.lignesReception.getRawValue() || []).map((l: any) => ({
      nom: (l.nom || '').trim(),
      etat: l.etat ?? null
    }));
    return JSON.stringify({
      descriptionTravaux: (raw.descriptionTravaux || '').trim(),
      lignesReception: rec,
      lignesDefauts: defauts,
      notesFicheAtelier: (this.notesFicheAtelier || '').trim()
    });
  }

  toggleDefautPresent(defaut: LigneDefaut): void {
    defaut.present = !defaut.present;
    if (!defaut.present) {
      defaut.designation = '';
    }
    this.cdr.markForCheck();
  }

  addCustomDefaut(): void {
    const nom = (this.nouveauDefautNom || '').trim();
    if (!nom) return;
    if (this.lignesDefauts.some(d => d.nom.toLowerCase() === nom.toLowerCase())) {
      this.nouveauDefautNom = '';
      return;
    }
    this.lignesDefauts.push({
      nom,
      present: true,
      designation: ''
    });
    this.nouveauDefautNom = '';
    this.cdr.markForCheck();
  }

  removeDefaut(index: number): void {
    this.lignesDefauts.splice(index, 1);
    this.cdr.markForCheck();
  }

  private buildLigneTravailGroup(l: LigneTravailOrdre) {
    return this.fb.group({
      nom: [l.nom, Validators.required],
      verrouille: [false],
    });
  }

  private setLignesTravaux(lignes: LigneTravailOrdre[] | null | undefined) {
    this.lignesTravaux.clear();
    (lignes || []).forEach(l => this.lignesTravaux.push(this.buildLigneTravailGroup(l)));
  }

  addLigneTravail(): void {
    this.lignesTravaux.push(this.buildLigneTravailGroup({ nom: '', verrouille: false }));
  }

  removeLigneTravail(index: number): void {
    this.lignesTravaux.removeAt(index);
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
    const list = (lignes && lignes.length > 0) ? lignes : DEFAULT_LIGNES_RECEPTION.map(nom => ({ nom, etat: null }));
    list.forEach(l => this.lignesReception.push(this.buildLigneReceptionGroup(l)));
  }

  nouveauPointNom = '';

  addLigneReception(): void {
    this.lignesReception.push(this.buildLigneReceptionGroup({ nom: '', etat: null, verrouille: false }));
  }

  addCustomPointReception(): void {
    const nom = (this.nouveauPointNom || '').trim();
    if (!nom) return;
    this.lignesReception.push(this.buildLigneReceptionGroup({ nom, etat: null, verrouille: false }));
    this.nouveauPointNom = '';
    this.cdr.markForCheck();
  }

  setLigneReceptionEtat(index: number, val: boolean): void {
    const ctrl = this.lignesReception.at(index);
    if (!ctrl) return;
    const current = ctrl.get('etat')?.value;
    ctrl.get('etat')?.setValue(current === val ? null : val);
    ctrl.markAsDirty();
    ctrl.markAsTouched();
    this.cdr.markForCheck();
  }

  removeLigneReception(index: number): void {
    this.lignesReception.removeAt(index);
    this.cdr.markForCheck();
  }

  validateStep(): void {
    this.saveStep1(true);
  }

  saveStep1(goToNext: boolean = false): void {
    const raw = this.step1Form.getRawValue();
    const descriptionTravaux = (raw.descriptionTravaux || '').trim();

    const lignesRec: LigneReceptionOrdre[] = (this.lignesReception.getRawValue() || []).map((l: any) => ({
      nom: (l.nom || '').trim(),
      etat: l.etat ?? null,
      verrouille: false
    })).filter((l: any) => !!l.nom);

    const lignesDef: LigneDefaut[] = (this.lignesDefauts || []).map(d => ({
      nom: (d.nom || '').trim(),
      present: !!d.present,
      designation: d.present ? (d.designation || '').trim() : ''
    }));

    const ordrePayload: StepReceptionDto = {
      numero: raw.numero,
      descriptionTravaux: descriptionTravaux,
      lignesTravaux: (raw.lignesTravaux || []) as LigneTravailOrdre[],
      lignesReception: lignesRec,
      listeDefauts: this.listeDefautsText,
      lignesDefauts: lignesDef,
      vehiculeId: Number(raw.vehiculeId),
      statut: (this.loadedOrdre?.statut || 'DIAGNOSTIC') as StatutOrdre
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
            vehiculeId: Number(raw.vehiculeId),
            nomChauffeur: this.ficheAtelier.nomChauffeur,
            telephoneChauffeur: this.ficheAtelier.telephoneChauffeur,
            niveauEssence: this.ficheAtelier.niveauEssence,
            kilometrage: this.selectedVehicule?.kilometrage || this.ficheAtelier.kilometrage,
            designationTravaux: descriptionTravaux,
            lignesReception: lignesRec.map(l => ({ nom: l.nom, etat: l.etat })),
            reception: lignesRec.map(l => ({ nom: l.nom, etat: l.etat })),
            lignesDefauts: lignesDef,
            defautsConstates: lignesDef,
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

