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
import { FicheAtelierDetailsResponse, LigneDefaut, LigneReception } from '../../../../fiches-atelier/models/fiche-atelier.model';

export const TRAVAUX_FREQUENTS = [
  'Vidange moteur',
  'Vidange boîte de vitesse',
  'Changement plaquettes de frein',
  'Changement disques de frein',
  'Changement courroie de distribution',
  'Diagnostic électronique',
  'Climatisation',
  'Parallélisme / géométrie',
  'Révision générale',
  'Changement pneus',
];

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

  travauxFrequents = TRAVAUX_FREQUENTS;
  selectedTravaux: string[] = [];
  autreTravaux = '';
  showAutreTravaux = false;

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

        this.step1Form.patchValue({
          numero: step.numero || ordre?.numero || '',
          vehiculeId: step.vehiculeId ?? step.vehicule?.id ?? ordre?.vehicule?.id ?? null,
          descriptionTravaux: step.descriptionTravaux || ordre?.descriptionTravaux || '',
        });

        // 1. Lignes de réception
        const initialLignesRec = (step.lignesReception && step.lignesReception.length > 0)
          ? step.lignesReception
          : (ordre?.lignesReception && ordre.lignesReception.length > 0 ? ordre.lignesReception : []);

        this.setLignesReception(initialLignesRec);
        this.setLignesTravaux(step.lignesTravaux || ordre?.lignesTravaux || []);

        const descTravaux = step.descriptionTravaux || ordre?.descriptionTravaux || '';
        const travauxDecomp = this.decomposeToCheckboxes(descTravaux, TRAVAUX_FREQUENTS);
        this.selectedTravaux = travauxDecomp.selected;
        this.autreTravaux = travauxDecomp.autre;
        this.showAutreTravaux = this.autreTravaux.length > 0;

        // 2. Recherche et chargement de la Fiche Atelier liée
        const ficheDirect = step.ficheAtelier || ordre?.ficheAtelier;
        const ficheId = step.ficheAtelierId || (ordre as any)?.ficheAtelierId || ficheDirect?.id;

        if (ficheDirect) {
          this.ficheAtelier = ficheDirect;
          this.initDefautsAndComplementaryData(ficheDirect, step, ordre);
          this.loading = false;
          this.cdr.markForCheck();
        } else if (ficheId) {
          this.ficheAtelierService.getById(ficheId).pipe(catchError(() => of(null))).subscribe({
            next: (fiche) => {
              this.ficheAtelier = fiche;
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
        verrouille: true
      })));
    }

    // Récupération des défauts constatés
    if (fiche?.lignesDefauts && fiche.lignesDefauts.length > 0) {
      this.lignesDefauts = fiche.lignesDefauts;
    } else if (step.lignesDefauts && step.lignesDefauts.length > 0) {
      this.lignesDefauts = step.lignesDefauts;
    } else if (ordre?.lignesDefauts && ordre.lignesDefauts.length > 0) {
      this.lignesDefauts = ordre.lignesDefauts;
    } else {
      this.lignesDefauts = [];
    }

    this.listeDefautsText = step.listeDefauts || ordre?.listeDefauts || '';

    // Si on a des informations complémentaires de la fiche atelier (kilométrage, etc.)
    if (fiche && this.selectedVehicule) {
      if (fiche.kilometrage && !this.selectedVehicule.kilometrage) {
        this.selectedVehicule.kilometrage = fiche.kilometrage;
      }
    }
  }

  private buildLigneTravailGroup(l: LigneTravailOrdre) {
    return this.fb.group({
      nom: [{ value: l.nom, disabled: !!l.verrouille }, Validators.required],
      verrouille: [!!l.verrouille],
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
    if (this.lignesTravaux.at(index)?.get('verrouille')?.value) return;
    this.lignesTravaux.removeAt(index);
  }

  private buildLigneReceptionGroup(l: LigneReceptionOrdre | LigneReception) {
    return this.fb.group({
      nom: [{ value: l.nom, disabled: !!(l as LigneReceptionOrdre).verrouille }, Validators.required],
      etat: [{ value: l.etat ?? null, disabled: !!(l as LigneReceptionOrdre).verrouille }],
      verrouille: [!!(l as LigneReceptionOrdre).verrouille],
    });
  }

  private setLignesReception(lignes: (LigneReceptionOrdre | LigneReception)[] | null | undefined) {
    this.lignesReception.clear();
    (lignes || []).forEach(l => this.lignesReception.push(this.buildLigneReceptionGroup(l)));
  }

  addLigneReception(): void {
    this.lignesReception.push(this.buildLigneReceptionGroup({ nom: '', etat: null, verrouille: false }));
  }

  setLigneReceptionEtat(index: number, val: boolean): void {
    const ctrl = this.lignesReception.at(index);
    if (!ctrl || ctrl.get('verrouille')?.value) return;
    const current = ctrl.get('etat')?.value;
    ctrl.get('etat')?.setValue(current === val ? null : val);
    ctrl.markAsDirty();
    ctrl.markAsTouched();
    this.cdr.markForCheck();
  }

  removeLigneReception(index: number): void {
    if (this.lignesReception.at(index)?.get('verrouille')?.value) return;
    this.lignesReception.removeAt(index);
  }

  toggleTravail(t: string): void {
    const idx = this.selectedTravaux.indexOf(t);
    if (idx >= 0) {
      this.selectedTravaux.splice(idx, 1);
    } else {
      this.selectedTravaux.push(t);
    }
  }

  private decomposeToCheckboxes(text: string, frequentList: string[]): { selected: string[], autre: string } {
    if (!text) return { selected: [], autre: '' };
    const items = text.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const selected: string[] = [];
    const others: string[] = [];
    for (const item of items) {
      if (frequentList.includes(item)) selected.push(item);
      else others.push(item);
    }
    return { selected, autre: others.join(', ') };
  }

  private composeFromCheckboxes(selected: string[], autre: string): string {
    const list = [...selected];
    if (autre && autre.trim().length > 0) {
      list.push(autre.trim());
    }
    return list.join(', ');
  }

  validateStep(): void {
    this.saveStep1ThenGoNext();
  }

  saveStep1ThenGoNext(): void {
    const descriptionTravaux = this.composeFromCheckboxes(this.selectedTravaux, this.autreTravaux);
    const raw = this.step1Form.value;

    const payload: StepReceptionDto = {
      numero: raw.numero,
      descriptionTravaux: descriptionTravaux,
      lignesTravaux: this.lignesTravaux.getRawValue() as LigneTravailOrdre[],
      lignesReception: this.lignesReception.getRawValue() as LigneReceptionOrdre[],
      listeDefauts: this.listeDefautsText,
      lignesDefauts: this.lignesDefauts,
      vehiculeId: Number(raw.vehiculeId),
      statut: 'DIAGNOSTIC' as StatutOrdre
    };

    this.saving = true;
    this.ordreService.updateStepReception(this.ordreId, payload).subscribe({
      next: () => {
        // Tente également la mise à jour explicite du statut de l'ordre
        this.ordreService.updateStatut(this.ordreId, 'DIAGNOSTIC').subscribe({
          next: () => {},
          error: () => {}
        });

        // Crée directement le diagnostic associé en statut 'EN_ATTENTE'
        this.diagnosticService.create({
          ordreReparationId: this.ordreId,
          statut: 'EN_ATTENTE',
          pannesDetectees: descriptionTravaux
        }).subscribe({
          next: () => {
            this.saving = false;
            this.successMessage = 'Réception validée et diagnostic créé en attente.';
            this.cdr.markForCheck();
            this.router.navigate(['/app/ordres-reparation', this.ordreId, 'diagnostic']);
          },
          error: () => {
            // Même si déjà créé, synchronise en EN_ATTENTE via saveStep
            this.diagnosticService.saveStep({
              ordreReparationId: this.ordreId,
              statut: 'EN_ATTENTE',
              listeDefauts: descriptionTravaux
            }).subscribe({
              next: () => {},
              error: () => {}
            });
            this.saving = false;
            this.router.navigate(['/app/ordres-reparation', this.ordreId, 'diagnostic']);
          }
        });
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la sauvegarde.';
        this.cdr.markForCheck();
      }
    });
  }
}

