import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { OrdreReparationService } from '../ordre-reparation.service';
import { VehiculeService } from '../../vehicules/vehicule.service';
import { ClientService } from '../../clients/client.service';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import {
  VehiculeModel,
  ClientListResponse,
  LigneReceptionOrdre,
  LigneTravailOrdre,
  OrdreReparationRequest,
  extractContent
} from '../../../shared/models';

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

export const PANNES_FREQUENTES = [
  'Fuite d\'huile moteur',
  'Fuite liquide de refroidissement',
  'Bruit suspension',
  'Vibration au freinage',
  'Surchauffe moteur',
  'Voyant moteur allumé',
  'Batterie faible',
  'Problème démarrage',
  'Usure pneus',
  'Jeu dans la direction',
];

export const DEFAULT_RECEPTION_CHECKLIST = [
  'Carrosserie (rayures, chocs)',
  'Intérieur / Habitacle (sellerie, tapis)',
  'Vitrage / Pare-brise',
  'Éclairage (phares, feux, clignotants)',
  'Accessoires (cric, roue de secours, gilet)',
  'Niveau de carburant & voyants tableau de bord',
];

@Component({
  selector: 'app-ordre-reparation-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    SearchableSelectComponent,
    AlertComponent
  ],
  templateUrl: './ordre-reparation-form.component.html'
})
export class OrdreReparationFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private ordreService = inject(OrdreReparationService);
  private vehiculeService = inject(VehiculeService);
  private clientService = inject(ClientService);
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  loading = false;
  saving = false;
  loadingVehicules = false;
  errorMessage = '';
  successMessage = '';

  clients: ClientListResponse[] = [];
  allVehicules: VehiculeModel[] = [];
  filteredVehicules: VehiculeModel[] = [];
  selectedVehicule: VehiculeModel | null = null;

  clientSearchSubject = new Subject<string>();
  vehiculeSearchSubject = new Subject<string>();

  travauxFrequents = TRAVAUX_FREQUENTS;
  selectedTravaux: string[] = [];
  autreTravaux = '';
  showAutreTravaux = false;

  pannesFrequentes = PANNES_FREQUENTES;
  selectedPannes: string[] = [];
  autrePannes = '';
  showAutrePannes = false;

  ngOnInit(): void {
    this.initForm();
    this.loadData();
    this.setupSearchSubjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchSubjects(): void {
    this.clientSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((term) => {
      this.searchClientsFromBackend(term);
    });

    this.vehiculeSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe((term) => {
      this.searchVehiculesFromBackend(term);
    });
  }

  searchClientsFromBackend(query: string): void {
    const q = (query || '').trim();
    this.clientService.getAll({ keyword: q, size: 50 }).subscribe({
      next: (data) => {
        this.clients = extractContent(data);
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  searchVehiculesFromBackend(query: string): void {
    const q = (query || '').trim();
    const clientId = this.form.get('clientId')?.value;
    this.vehiculeService.getAll({ keyword: q, size: 50 }).subscribe({
      next: (data) => {
        const arr = extractContent(data);
        this.filteredVehicules = clientId ? arr.filter(v => v.client?.id === clientId) : arr;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  initForm(): void {
    this.form = this.fb.group({
      numero: [''],
      clientId: [null],
      vehiculeId: [null, Validators.required],
      kilometrage: [null, [Validators.min(0)]],
      dateSortie: [''],
      descriptionTravaux: [''],
      lignesReception: this.fb.array([]),
      lignesTravaux: this.fb.array([])
    });

    // Initialiser les points de contrôle de réception par défaut
    DEFAULT_RECEPTION_CHECKLIST.forEach(nom => {
      this.lignesReception.push(this.fb.group({
        nom: [nom, Validators.required],
        etat: [null],
        verrouille: [false]
      }));
    });
  }

  get lignesReception(): FormArray {
    return this.form.get('lignesReception') as FormArray;
  }

  get lignesTravaux(): FormArray {
    return this.form.get('lignesTravaux') as FormArray;
  }

  addLigneReception(): void {
    this.lignesReception.push(this.fb.group({
      nom: ['', Validators.required],
      etat: [null],
      verrouille: [false]
    }));
  }

  removeLigneReception(index: number): void {
    this.lignesReception.removeAt(index);
  }

  addLigneTravail(): void {
    this.lignesTravaux.push(this.fb.group({
      nom: ['', Validators.required],
      verrouille: [false]
    }));
  }

  removeLigneTravail(index: number): void {
    this.lignesTravaux.removeAt(index);
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      clients: this.clientService.getAll({ size: 300 }),
      vehicules: this.vehiculeService.getAll({ size: 300 })
    }).subscribe({
      next: ({ clients, vehicules }) => {
        this.clients = extractContent(clients as any);
        this.allVehicules = extractContent(vehicules as any);
        this.filteredVehicules = [...this.allVehicules];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement clients/véhicules', err);
        this.loading = false;
        this.errorMessage = 'Impossible de charger la liste des clients et véhicules.';
        this.cdr.markForCheck();
      }
    });
  }

  formatClient = (c: ClientListResponse): string => {
    if (!c) return '';
    const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
    const contact = c.phone || c.email || '';
    return contact ? `${name} (${contact})` : name;
  };

  formatVehicule = (v: VehiculeModel): string => {
    if (!v) return '';
    const immat = v.immatriculation || '';
    const details = `${v.marque || ''} ${v.modele || ''}`.trim();
    const clientName = v.client ? ` — ${v.client.firstName || ''} ${v.client.lastName || ''}` : '';
    return `${immat} (${details})${clientName}`;
  };

  onClientChange(val: any): void {
    const clientId = typeof val === 'object' && val !== null && 'target' in val
      ? (val.target as HTMLSelectElement).value ? +((val.target as HTMLSelectElement).value) : null
      : (val ? +val : null);

    this.form.patchValue({ clientId: clientId, vehiculeId: null });
    this.selectedVehicule = null;

    if (clientId) {
      this.loadingVehicules = true;
      this.vehiculeService.getByClient(clientId).subscribe({
        next: (data) => {
          this.filteredVehicules = extractContent(data);
          this.loadingVehicules = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.filteredVehicules = [];
          this.loadingVehicules = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.filteredVehicules = [...this.allVehicules];
    }
  }

  onVehiculeChange(val: any): void {
    const vehiculeId = typeof val === 'object' && val !== null && 'target' in val
      ? (val.target as HTMLSelectElement).value ? +((val.target as HTMLSelectElement).value) : null
      : (val ? +val : null);

    if (vehiculeId) {
      const found = this.allVehicules.find(v => v.id === vehiculeId) || this.filteredVehicules.find(v => v.id === vehiculeId);
      this.selectedVehicule = found || null;
      if (found) {
        if (found.kilometrage != null) {
          this.form.patchValue({ kilometrage: found.kilometrage });
        }
        if (found.client?.id && !this.form.get('clientId')?.value) {
          this.form.patchValue({ clientId: found.client.id });
        }
      }
    } else {
      this.selectedVehicule = null;
    }
  }

  toggleTravaux(t: string): void {
    const idx = this.selectedTravaux.indexOf(t);
    if (idx >= 0) {
      this.selectedTravaux.splice(idx, 1);
    } else {
      this.selectedTravaux.push(t);
    }
  }

  togglePanne(p: string): void {
    const idx = this.selectedPannes.indexOf(p);
    if (idx >= 0) {
      this.selectedPannes.splice(idx, 1);
    } else {
      this.selectedPannes.push(p);
    }
  }

  private buildDescriptionTravaux(): string {
    const list = [...this.selectedTravaux];
    if (this.showAutreTravaux && this.autreTravaux.trim()) {
      list.push(this.autreTravaux.trim());
    }
    return list.join(', ');
  }

  private buildListeDefauts(): string {
    const list = [...this.selectedPannes];
    if (this.showAutrePannes && this.autrePannes.trim()) {
      list.push(this.autrePannes.trim());
    }
    return list.join(', ');
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Veuillez renseigner tous les champs obligatoires (notamment le véhicule).';
      return;
    }

    const descriptionTravaux = this.buildDescriptionTravaux();
    const rawLignesTravaux = (this.lignesTravaux.getRawValue() as LigneTravailOrdre[]).filter(l => l.nom && l.nom.trim());

    if (!descriptionTravaux && rawLignesTravaux.length === 0) {
      this.errorMessage = 'Veuillez sélectionner ou saisir au moins un travail demandé.';
      return;
    }

    const raw = this.form.getRawValue();

    let formattedDateSortie: string | undefined = undefined;
    if (raw.dateSortie) {
      if (raw.dateSortie.length === 10) {
        formattedDateSortie = raw.dateSortie + 'T00:00:00';
      } else if (raw.dateSortie.endsWith('Z')) {
        formattedDateSortie = raw.dateSortie.slice(0, -1);
      } else {
        formattedDateSortie = raw.dateSortie;
      }
    }

    const payload: OrdreReparationRequest = {
      numero: raw.numero?.trim() || '',
      vehiculeId: Number(raw.vehiculeId),
      descriptionTravaux: descriptionTravaux || rawLignesTravaux.map(l => l.nom).join(', '),
      lignesTravaux: rawLignesTravaux,
      lignesReception: (raw.lignesReception as LigneReceptionOrdre[]).filter(l => l.nom && l.nom.trim()),
      listeDefauts: this.buildListeDefauts(),
      dateSortie: formattedDateSortie,
      statut: 'RECEPTION'
    };

    this.saving = true;

    // Si un kilométrage a été saisi, on peut mettre à jour le véhicule
    if (this.selectedVehicule && raw.kilometrage != null && raw.kilometrage !== this.selectedVehicule.kilometrage) {
      this.vehiculeService.update(this.selectedVehicule.id, {
        immatriculation: this.selectedVehicule.immatriculation,
        marque: this.selectedVehicule.marque,
        modele: this.selectedVehicule.modele,
        annee: this.selectedVehicule.annee,
        kilometrage: Number(raw.kilometrage),
        numeroChassis: this.selectedVehicule.numeroChassis,
        clientId: this.selectedVehicule.client?.id ?? null
      }).subscribe({
        error: (e) => console.warn('Could not update vehicle mileage', e)
      });
    }

    this.ordreService.create(payload).subscribe({
      next: (res) => {
        this.saving = false;
        this.successMessage = `L'ordre de réparation #${res.numero || res.id} a été créé avec succès ! Redirection en cours...`;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.router.navigate(['/app/ordres-reparation', res.id]);
        }, 1000);
      },
      error: (err) => {
        console.error('Erreur création ordre de réparation', err);
        this.saving = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la création de l\'ordre de réparation.';
        this.cdr.markForCheck();
      }
    });
  }

  annuler(): void {
    this.router.navigate(['/app/ordres-reparation']);
  }
}
