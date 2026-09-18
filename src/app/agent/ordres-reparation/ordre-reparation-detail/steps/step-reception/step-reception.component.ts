import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdreReparationService } from '../../../ordre-reparation.service';
import { DiagnosticService } from '../../../../diagnostics/diagnostic.service';
import { VehiculeService } from '../../../../vehicules/vehicule.service';
import { AlertComponent } from '../../../../../shared/components/alert/alert.component';
import {
  OrdreReparation,
  VehiculeModel,
  LigneReceptionOrdre,
  LigneTravailOrdre,
  StatutOrdre
} from '../../../../../shared/models';

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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, AlertComponent],
  templateUrl: './step-reception.component.html'
})
export class StepReceptionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordreService = inject(OrdreReparationService);
  private diagnosticService = inject(DiagnosticService);
  private vehiculeService = inject(VehiculeService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  ordreId!: number;
  loadedOrdre: OrdreReparation | null = null;
  selectedVehicule: VehiculeModel | null = null;

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
    this.ordreService.getById(this.ordreId).subscribe({
      next: (o: OrdreReparation) => {
        this.loadedOrdre = o;
        this.selectedVehicule = o.vehicule as any;

        if (o.vehicule?.id) {
          this.vehiculeService.getById(o.vehicule.id).subscribe({
            next: (fullV) => {
              this.selectedVehicule = fullV;
              this.cdr.markForCheck();
            },
            error: () => {}
          });
        }

        this.step1Form.patchValue({
          numero: o.numero,
          vehiculeId: o.vehicule?.id ?? null,
          descriptionTravaux: o.descriptionTravaux,
        });

        this.setLignesReception(o.lignesReception);
        this.setLignesTravaux(o.lignesTravaux);

        const travauxDecomp = this.decomposeToCheckboxes(o.descriptionTravaux, TRAVAUX_FREQUENTS);
        this.selectedTravaux = travauxDecomp.selected;
        this.autreTravaux = travauxDecomp.autre;
        this.showAutreTravaux = this.autreTravaux.length > 0;

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du chargement de l\'ordre.';
        this.cdr.markForCheck();
      }
    });
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

  private buildLigneReceptionGroup(l: LigneReceptionOrdre) {
    return this.fb.group({
      nom: [{ value: l.nom, disabled: !!l.verrouille }, Validators.required],
      etat: [{ value: l.etat, disabled: !!l.verrouille }],
      verrouille: [!!l.verrouille],
    });
  }

  private setLignesReception(lignes: LigneReceptionOrdre[] | null | undefined) {
    this.lignesReception.clear();
    (lignes || []).forEach(l => this.lignesReception.push(this.buildLigneReceptionGroup(l)));
  }

  addLigneReception(): void {
    this.lignesReception.push(this.buildLigneReceptionGroup({ nom: '', etat: null, verrouille: false }));
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
    const payload = {
      numero: raw.numero,
      descriptionTravaux: descriptionTravaux,
      lignesTravaux: this.lignesTravaux.getRawValue() as LigneTravailOrdre[],
      lignesReception: this.lignesReception.getRawValue() as LigneReceptionOrdre[],
      vehiculeId: Number(raw.vehiculeId),
      statut: 'EN_DIAGNOSTIC' as StatutOrdre
    };

    this.saving = true;
    this.ordreService.update(this.ordreId, payload).subscribe({
      next: () => {
        // Tente également la mise à jour explicite du statut de l'ordre
        this.ordreService.updateStatut(this.ordreId, 'EN_DIAGNOSTIC').subscribe({
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
