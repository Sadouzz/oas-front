import { Component, inject, OnInit, HostListener, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { NgClass, NgStyle } from '@angular/common';
import { forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { FicheAtelierService, FicheAtelier, StatutReparation } from '../services/fiche-atelier.service';
import { VehiculeService, VehiculeModel } from '../services/vehicule.service';
import { MecanicienService, Mecanicien } from '../services/mecanicien.service';
import { PieceDetacheeService, PieceDetache } from '../services/piece-detachee.service';
import { MainDoeuvreService, MainDoeuvreModel } from '../services/main-doeuvre.service';
import { BonDeSortieService } from '../services/bon-de-sortie.service';
import { BonDeCommandeService, BonDeCommandeRequest } from '../services/bon-de-commande.service';
import { ProformaService } from '../services/proforma.service';
import { FournisseurService, FournisseurModel } from '../services/fournisseur.service';
import { ClientService, UserModel } from '../services/client.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

export interface LignePiece {
  piece: PieceDetache;
  quantite: number;
  stockDisponible: number;
  manquant: number;
  aSortirMagasin?: number;
  stockAtelier?: number;
}

export interface LigneMO {
  mo: MainDoeuvreModel;
  quantite: number;
}

const STATUT_STEPS: { statut: StatutReparation | 'EN_ATTENTE_PROFORMA'; label: string }[] = [
  { statut: 'A_FAIRE',            label: 'Réception'   },
  { statut: 'EN_DIAGNOSTIC',      label: 'Diagnostic'  },
  { statut: 'EN_ATTENTE_PROFORMA', label: 'Proforma'   },
  { statut: 'EN_COURS',           label: 'Bon sortie'  },
  { statut: 'TERMINE',            label: 'Réparation'  },
  { statut: 'LIVRE',              label: 'Livraison'   },
];

@Component({
  selector: 'app-fiches-atelier',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, NgClass, NgStyle, AlertComponent, PaginationComponent],
  templateUrl: './fiches-atelier.component.html',
})
export class FichesAtelierComponent implements OnInit {
  private service         = inject(FicheAtelierService);
  private vehiculeService = inject(VehiculeService);
  private mecService      = inject(MecanicienService);
  private pieceService    = inject(PieceDetacheeService);
  private moService       = inject(MainDoeuvreService);
  private bdcService      = inject(BonDeCommandeService);
  private bdsService      = inject(BonDeSortieService);
  private proformaService = inject(ProformaService);
  private fournisseurSvc  = inject(FournisseurService);
  private clientService   = inject(ClientService);
  private fb              = inject(FormBuilder);

  // ─── Liste ───────────────────────────────────────────
  fiches: FicheAtelier[] = [];
  filtered: FicheAtelier[] = [];
  loading = true;
  page = 1;
  pageSize = 10;
  successMessage = '';
  errorMessage = '';
  selectedFiche: FicheAtelier | null = null;

  // ─── Référentiels ─────────────────────────────────────
  vehicules: VehiculeModel[] = [];
  allClients: UserModel[] = [];
  allMecaniciens: Mecanicien[] = [];
  allPieces: PieceDetache[] = [];
  allMO: MainDoeuvreModel[] = [];
  fournisseurs: FournisseurModel[] = [];

  // ─── Workflow Modal ────────────────────────────────────
  showWorkflow = false;
  isNew = true;
  editingId: number | null = null;
  currentStep = 1;
  saving = false;
  statutSteps = STATUT_STEPS;

  // Étape 1 — Réception
  step1Form: FormGroup = this.fb.group({
    numero:             ['', Validators.required],
    vehiculeId:         [null, Validators.required],
    listeReception:     [''],
    descriptionTravaux: ['', Validators.required],
  });

  // Étape 2 — Diagnostic
  step2Form: FormGroup = this.fb.group({
    listeDefauts: [''],
    dateSortie:   [''],
  });

  // ─── Sélecteur véhicule full-UX ───────────────────────
  vehiculeSearch = '';
  showVehiculeDropdown = false;
  selectedVehicule: VehiculeModel | null = null;
  get vehiculesFiltres(): VehiculeModel[] {
    const q = this.vehiculeSearch.toLowerCase();
    if (!q) return this.vehicules.slice(0, 20);
    return this.vehicules.filter(v =>
      v.immatriculation.toLowerCase().includes(q) ||
      v.marque.toLowerCase().includes(q) ||
      v.modele.toLowerCase().includes(q) ||
      (v.client ? (v.client.firstName + ' ' + v.client.lastName).toLowerCase().includes(q) : false)
    ).slice(0, 20);
  }

  selectVehicule(v: VehiculeModel) {
    this.selectedVehicule = v;
    this.vehiculeSearch   = v.immatriculation + ' — ' + v.marque + ' ' + v.modele;
    this.showVehiculeDropdown = false;
    this.step1Form.patchValue({ vehiculeId: v.id });
  }

  clearVehicule() {
    this.selectedVehicule = null;
    this.vehiculeSearch   = '';
    this.showVehiculeDropdown = false;
    this.step1Form.patchValue({ vehiculeId: null });
  }

  // ─── Créer client inline ───────────────────────────────
  showCreateClient = false;
  creatingClient = false;
  clientForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    phone:     ['', Validators.required],
    email:     [''],
    username:  ['', Validators.required],
    password:  ['', Validators.required],
    matricule: [''],
  });

  // ─── Créer véhicule inline ────────────────────────────
  showCreateVehicule = false;
  creatingVehicule = false;
  vehiculeForm: FormGroup = this.fb.group({
    immatriculation: ['', Validators.required],
    marque:          ['', Validators.required],
    modele:          ['', Validators.required],
    annee:           [null],
    kilometrage:     [null, Validators.required],
    numeroChassis:   [''],
    clientId:        [null],
  });
  vehiculeClientSearch = '';
  showVehiculeClientDropdown = false;
  selectedVehiculeClient: UserModel | null = null;
  get clientsFiltres(): UserModel[] {
    const q = this.vehiculeClientSearch.toLowerCase();
    if (!q) return this.allClients.slice(0, 20);
    return this.allClients.filter(c =>
      (c.firstName + ' ' + c.lastName).toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q)
    ).slice(0, 20);
  }
  selectClientForVehicule(c: UserModel) {
    this.selectedVehiculeClient   = c;
    this.vehiculeClientSearch     = c.firstName + ' ' + c.lastName;
    this.showVehiculeClientDropdown = false;
    this.vehiculeForm.patchValue({ clientId: c.id });
  }

  // ─── Étape 3 — Pièces, MO & Mécaniciens ───────────────
  lignesPieces: LignePiece[] = [];
  lignesMO: LigneMO[] = [];
  selectedMecs: number[] = [];
  mecToggling: number | null = null;
  pieceAjouter: number | null = null;
  qteAjouter = 1;
  moAjouter: number | null = null;
  qteAjouterMO = 1;

  // ─── Recherche pièces / MO ────────────────────────────
  pieceSearch = '';
  moSearch = '';
  get piecesFiltrees(): PieceDetache[] {
    const q = this.pieceSearch.toLowerCase();
    if (!q) return this.allPieces;
    return this.allPieces.filter(p =>
      p.reference.toLowerCase().includes(q) ||
      (p.categorie ?? '').toLowerCase().includes(q) ||
      (p.numeroDeSerie ?? '').toLowerCase().includes(q)
    );
  }
  get moFiltrees(): MainDoeuvreModel[] {
    const q = this.moSearch.toLowerCase();
    if (!q) return this.allMO;
    return this.allMO.filter(m =>
      m.categorie.nom.toLowerCase().includes(q)
    );
  }

  // ─── Popup Bon de Commande ─────────────────────────────
  showBDCModal = false;
  bdcFournisseurId: number | null = null;
  bdcSaving = false;

  // ─── Proforma ───────────────────────────────────────────
  currentProforma: any = null;
  proformaSaving = false;

  // ─── Bon de Sortie ─────────────────────────────────────
  bdsCreating = false;

  ngOnInit() {
    this.load();
    this.loadReferentiels();
  }

  private loadReferentiels() {
    forkJoin({
      vehicules:    this.vehiculeService.getAll(),
      mecaniciens:  this.mecService.getAll(),
      pieces:       this.pieceService.getAll(),
      mo:           this.moService.getAll(),
      fournisseurs: this.fournisseurSvc.getAll(),
      clients:      this.clientService.getAll(),
    }).subscribe({
      next: ({ vehicules, mecaniciens, pieces, mo, fournisseurs, clients }) => {
        this.vehicules      = vehicules;
        this.allMecaniciens = mecaniciens;
        this.allPieces      = pieces.filter(p => p.statut === 'ACTIF');
        this.allMO          = mo.filter(m => !m.isArchived);
        this.fournisseurs   = fournisseurs.filter(f => !f.archived);
        this.allClients     = clients;
      },
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => {
        this.fiches   = data;
        this.applyFilter();
        this.loading  = false;
        if (this.selectedFiche) {
          this.selectedFiche = data.find(f => f.id === this.selectedFiche!.id) ?? null;
        }
      },
      error: () => this.loading = false,
    });
  }

  // ─── Recherche ───────────────────────────────────────
  searchKw = '';
  applyFilter() {
    const kw = this.searchKw.toLowerCase();
    this.filtered = kw
      ? this.fiches.filter(f =>
          f.numero.toLowerCase().includes(kw) ||
          (f.vehicule?.immatriculation ?? '').toLowerCase().includes(kw) ||
          f.descriptionTravaux.toLowerCase().includes(kw) ||
          (f.statut ?? '').toLowerCase().includes(kw)
        )
      : [...this.fiches];
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchKw = (e.target as HTMLInputElement).value;
    this.applyFilter();
  }

  // ─── Ouverture Workflow ───────────────────────────────
  /**
   * CRÉATION : on ouvre seulement l'étape 1 (Réception).
   * On ne montre pas le stepper complet — la fiche est sauvegardée
   * à la fin de l'étape 1, et le diagnostic se fait ultérieurement.
   */
  openNew() {
    this.isNew       = true;
    this.editingId   = null;
    this.currentStep = 1;
    this.resetForms();
    this.showWorkflow = true;
  }

  /**
   * ÉDITION : on ouvre le stepper complet depuis l'étape du statut actuel.
   */
  openEdit(f: FicheAtelier) {
    this.isNew     = false;
    this.editingId = f.id;
    this.currentStep = this.statutToStep(f.statut);
    this.step1Form.patchValue({
      numero:             f.numero,
      vehiculeId:         f.vehicule?.id ?? null,
      listeReception:     f.listeReception ?? '',
      descriptionTravaux: f.descriptionTravaux,
    });
    this.step2Form.patchValue({
      listeDefauts: f.listeDefauts ?? '',
      dateSortie:   f.dateSortie ? f.dateSortie.substring(0, 10) : '',
    });
    
    // Charger le proforma pour toute fiche qui en a un (step 3+)
    const needsProforma = ['EN_ATTENTE_PROFORMA', 'EN_COURS', 'TERMINE', 'LIVRE'].includes(f.statut as string);
    if (needsProforma) {
      this.proformaService.getByFicheAtelierId(f.id).subscribe({
        next: (p) => {
          this.currentProforma = p;
          // Reconstituer les lignes pièces depuis le proforma
          this.lignesPieces = p.lignesPieces
            .map(lp => {
              const piece = this.allPieces.find(pp => pp.id === lp.pieceId);
              if (!piece) return null;
              const stockAtelier = piece.stockAtelier ?? 0;
              const stockMagasin = piece.stockMagasin ?? 0;
              const manquantAtelier = Math.max(0, lp.quantite - stockAtelier);
              const aSortirMagasin = Math.min(manquantAtelier, stockMagasin);
              const manquantGlobal = Math.max(0, manquantAtelier - stockMagasin);
              
              return { 
                piece, 
                quantite: lp.quantite, 
                stockDisponible: stockAtelier + stockMagasin, 
                manquant: manquantGlobal,
                aSortirMagasin: aSortirMagasin,
                stockAtelier: stockAtelier
              } as LignePiece;
            })
            .filter((l) => l !== null) as LignePiece[];
          // Reconstituer les lignes MO depuis le proforma
          this.lignesMO = p.lignesMainDoeuvres
            .map(lmd => {
              const mo = this.allMO.find(m => m.id === lmd.mainDoeuvreId);
              if (!mo) return null;
              return { mo, quantite: lmd.nbreHeure };
            })
            .filter((l): l is LigneMO => l !== null);
        },
        error: () => {
          this.currentProforma = null;
          this.lignesPieces = [];
          this.lignesMO = [];
        }
      });
    } else {
      this.currentProforma = null;
      this.lignesPieces = [];
      this.lignesMO = [];
    }

    if (f.vehicule) {
      const v = this.vehicules.find(vv => vv.id === f.vehicule!.id);
      if (v) {
        this.selectedVehicule = v;
        this.vehiculeSearch   = v.immatriculation + ' — ' + v.marque + ' ' + v.modele;
      }
    }
    this.selectedMecs = f.mecaniciens.map(m => m.id);
    this.lignesPieces = [];
    this.lignesMO     = [];
    this.showWorkflow = true;
  }

  private resetForms() {
    this.step1Form.reset();
    this.step2Form.reset();
    this.lignesPieces = [];
    this.lignesMO     = [];
    this.selectedMecs = [];
    this.selectedVehicule = null;
    this.vehiculeSearch   = '';
    this.showVehiculeDropdown = false;
    this.showCreateClient  = false;
    this.showCreateVehicule = false;
    this.clientForm.reset();
    this.vehiculeForm.reset();
    this.selectedVehiculeClient = null;
    this.vehiculeClientSearch   = '';
  }

  closeWorkflow() {
    this.showWorkflow = false;
    this.showBDCModal = false;
  }

  // ─── Étapes : max steps selon mode ───────────────────
  get maxStep(): number {
    return this.isNew ? 1 : 6;
  }

  get canNext(): boolean {
    if (this.currentStep === 1) return this.step1Form.valid;
    return true;
  }

  nextStep() {
    if (!this.canNext) { this.step1Form.markAllAsTouched(); return; }
    if (this.currentStep === 1) { this.saveStep1ThenGoNext(); return; }
    if (this.currentStep === 2) { this.saveStep2ThenGoNext(); return; }
    // if (this.currentStep === 3) { this.checkStockThenGoNext(); return; } // Removed, Proforma created manually
    if (this.currentStep < 6) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  goToStep(n: number) {
    if (n < this.currentStep && !this.isNew) this.currentStep = n;
  }

  // ─── Étape 1 ─────────────────────────────────────────
  private saveStep1ThenGoNext() {
    if (this.step1Form.invalid) { this.step1Form.markAllAsTouched(); return; }
    const raw = this.step1Form.value;
    const payload = {
      numero:             raw.numero,
      descriptionTravaux: raw.descriptionTravaux,
      listeReception:     raw.listeReception || undefined,
      vehiculeId:         Number(raw.vehiculeId),
      statut:             'A_FAIRE' as StatutReparation,
    };
    this.saving = true;
    const wasNew = this.isNew;
    const req$ = wasNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, { ...payload, statut: undefined });

    req$.subscribe({
      next: (f) => {
        this.saving    = false;
        this.editingId = f.id;
        this.isNew     = false;
        // Toujours avancer au diagnostic (step 2), que ce soit une création ou une édition
        this.advanceStatutTo('EN_DIAGNOSTIC', () => { 
          this.currentStep = 2; 
          this.load(); 
          if (wasNew) this.notify('Fiche créée. Complétez le diagnostic.'); 
        });
      },
      error: (err) => { 
        console.error('SAVE STEP 1 ERROR:', JSON.stringify(err.error));
        this.saving = false; 
        this.notifyError(err.error?.message || 'Erreur lors de la sauvegarde.'); 
      },
    });
  }

  // ─── Étape 2 ─────────────────────────────────────────
  private saveStep2ThenGoNext() {
    const raw = this.step2Form.value;
    this.saving = true;
    this.service.update(this.editingId!, {
      numero:             this.step1Form.value.numero,
      descriptionTravaux: this.step1Form.value.descriptionTravaux,
      listeReception:     this.step1Form.value.listeReception || undefined,
      vehiculeId:         Number(this.step1Form.value.vehiculeId),
      listeDefauts:       raw.listeDefauts || undefined,
      dateSortie:         raw.dateSortie ? (raw.dateSortie.includes('T') ? raw.dateSortie : raw.dateSortie + 'T00:00:00') : undefined,
    }).subscribe({
      next: () => {
        this.saving = false;
        // Avancer le statut à EN_ATTENTE_PROFORMA pour que le stepper soit correct au retour
        this.advanceStatutTo('EN_ATTENTE_PROFORMA' as StatutReparation, () => {
          this.closeWorkflow();
          this.load();
          this.notify('Diagnostic enregistré. La fiche est désormais en attente de proforma.');
        });
      },
      error: (err) => { 
        console.error('SAVE STEP 2 ERROR:', JSON.stringify(err.error));
        this.saving = false; 
        this.notifyError(err.error?.message || 'Erreur lors de la sauvegarde.'); 
      },
    });
  }

  // ─── Proforma (Nouvelle Étape 3) ──────────────────────
  createProforma() {
    if (this.lignesPieces.length === 0 && this.lignesMO.length === 0) {
      this.notifyError('Veuillez ajouter au moins une pièce ou une main d\'œuvre.');
      return;
    }
    
    const fiche = this.fiches.find(f => f.id === this.editingId);
    if (!fiche?.vehicule) return;
    const clientId = fiche.vehicule.client?.id;
    if (!clientId) { this.notifyError('Aucun client associé au véhicule.'); return; }

    this.proformaSaving = true;

    // Enregistrer les pannes et défauts d'abord
    const raw = this.step2Form.value;
    this.service.update(this.editingId!, {
      numero:             this.step1Form.value.numero,
      descriptionTravaux: this.step1Form.value.descriptionTravaux,
      listeReception:     this.step1Form.value.listeReception || undefined,
      vehiculeId:         Number(this.step1Form.value.vehiculeId),
      listeDefauts:       raw.listeDefauts || undefined,
      dateSortie:         raw.dateSortie ? (raw.dateSortie.includes('T') ? raw.dateSortie : raw.dateSortie + 'T00:00:00') : undefined,
    }).subscribe({
      next: () => {
        // Ensuite on crée le proforma
        this.proformaService.create({
          ficheAtelierId: this.editingId!,
          clientId,
          vehiculeId: fiche.vehicule!.id,
          kilometrage: fiche.vehicule!.kilometrage ?? 0,
          lignesPieces: this.lignesPieces.map(l => ({ pieceId: l.piece.id, quantite: l.quantite, prix: l.piece.prix ?? 0 })),
          lignesMainDoeuvres: this.lignesMO.map(l => ({ mainDoeuvreId: l.mo.id, nbreHeure: l.quantite, tarifHoraire: l.mo.prix ?? 0 }))
        }).subscribe({
          next: (p) => {
            this.proformaSaving = false;
            this.currentProforma = p;
            this.notify('Proforma créé et assigné au client.');
            this.currentStep = 3;
            this.load();
          },
          error: (err) => {
            this.proformaSaving = false;
            this.notifyError(err.error?.message || 'Erreur lors de la création du proforma.');
          }
        });
      },
      error: (err) => {
        this.proformaSaving = false;
        this.notifyError('Erreur lors de la sauvegarde des pannes : ' + (err.error?.message || ''));
      }
    });
  }

  validerProforma() {
    if (!this.currentProforma) return;
    this.proformaSaving = true;
    this.proformaService.valider(this.currentProforma.id).subscribe({
      next: () => {
        this.proformaSaving = false;
        this.notify('Proforma validé par le client. Début des réparations.');
        this.currentStep = 4; // Passe à l'étape réparation
        this.load();
      },
      error: (err) => {
        this.proformaSaving = false;
        this.notifyError(err.error?.message || 'Erreur lors de la validation du proforma.');
      }
    });
  }

  // ─── Proforma validé → Bon de Sortie (Étape 4) ───────
  goToBonDeSortie() {
    // Après validation du proforma, passer à l'étape Bon de Sortie
    this.currentStep = 4;
  }

  // ─── Bon de Sortie & Affectation (Étape 4) → Réparation (Étape 5) ─────────────
  checkStockAndStartReparation() {
    if (this.selectedMecs.length === 0) {
      this.notifyError('Veuillez affecter au moins un mécanicien.');
      return;
    }

    const ruptures = this.lignesPieces.filter(l => l.manquant > 0);
    if (ruptures.length > 0) { 
      this.showBDCModal = true; 
      return;
    }

    const aSortir = this.lignesPieces.filter(l => (l.aSortirMagasin || 0) > 0);
    if (aSortir.length > 0) {
      this.createBonDeSortie(aSortir);
    } else {
      this.startReparation();
    }
  }

  createBonDeSortie(lignes: LignePiece[]) {
    const fiche = this.fiches.find(f => f.id === this.editingId);
    if (!fiche?.vehicule) return;
    const clientId = fiche.vehicule.client?.id;
    if (!clientId) { this.notifyError('Aucun client associé au véhicule.'); return; }

    this.bdsCreating = true;
    this.bdsService.creer({
      clientId,
      vehiculeId:         fiche.vehicule!.id,
      lignesPieces:       lignes.map(l => ({ pieceId: l.piece.id, quantite: l.aSortirMagasin!, prix: l.piece.prix ?? null })),
      lignesMainDoeuvres: [],
      remarque:           `Bon de sortie automatique pour réparation FA-${this.editingId}`,
    }).subscribe({
      next: () => {
        this.bdsCreating = false;
        this.notify('Bon de sortie créé. Début de la réparation.');
        this.startReparation();
      },
      error: (err: any) => {
        this.bdsCreating = false;
        this.notifyError(err.error?.message || 'Erreur création bon de sortie.');
      }
    });
  }

  startReparation() {
    this.advanceStatutTo('TERMINE', () => {
      this.currentStep = 5;
      this.load();
    });
  }

  terminerReparation() {
    this.saving = true;
    this.advanceStatutTo('LIVRE', () => {
      this.saving = false;
      this.currentStep = 6;
      this.notify('Réparation terminée. Fiche prête pour livraison.');
      this.load();
    });
  }

  private advanceStatutTo(statut: StatutReparation, cb: () => void) {
    if (!this.editingId) { cb(); return; }
    this.service.updateStatut(this.editingId, statut).subscribe({ 
      next: () => cb(), 
      error: (err) => {
        console.error('PATCH STATUT ERROR:', JSON.stringify(err.error));
        cb();
      }
    });
  }

  // ─── Création Client inline ───────────────────────────
  toggleCreateClient() {
    this.showCreateClient = !this.showCreateClient;
    if (this.showCreateClient) this.clientForm.reset();
  }

  saveClient() {
    if (this.clientForm.invalid) { this.clientForm.markAllAsTouched(); return; }
    this.creatingClient = true;
    const v = this.clientForm.value;
    const payload = {
      firstName: v.firstName,
      lastName:  v.lastName,
      phone:     v.phone,
      email:     v.email || v.username + '@oas.sn',
      username:  v.username,
      password:  v.password,
      matricule: v.matricule || 'CLI-' + Date.now(),
      type:      'CLIENT'
    };
    this.clientService.create(payload).subscribe({
      next: () => {
        this.clientService.getAll().subscribe(clients => {
          this.allClients = clients;
          this.creatingClient    = false;
          this.showCreateClient  = false;
          const newClient = clients.find(c => c.username === payload.username);
          if (newClient) {
            this.selectClientForVehicule(newClient);
          }
          this.clientForm.reset();
          this.notify('Client créé et sélectionné avec succès !');
        });
      },
      error: (err) => { 
        this.creatingClient = false; 
        const msg = err.error?.message || err.error || 'Erreur lors de la création du client.';
        this.notifyError(msg); 
      },
    });
  }

  // ─── Création Véhicule inline ─────────────────────────
  toggleCreateVehicule() {
    this.showCreateVehicule = !this.showCreateVehicule;
    if (this.showCreateVehicule) {
      this.vehiculeForm.reset();
      this.selectedVehiculeClient = null;
      this.vehiculeClientSearch   = '';
    }
  }

  saveVehicule() {
    if (this.vehiculeForm.invalid) { this.vehiculeForm.markAllAsTouched(); return; }
    const v = this.vehiculeForm.value;
    if (!v.clientId) {
      this.notifyError('Veuillez sélectionner ou créer un client pour ce véhicule.');
      return;
    }
    this.creatingVehicule = true;
    this.vehiculeService.create({
      immatriculation: v.immatriculation,
      marque:          v.marque,
      modele:          v.modele,
      annee:           v.annee   || null,
      kilometrage:     v.kilometrage || null,
      numeroChassis:   v.numeroChassis || '',
      clientId:        v.clientId || null,
    }).subscribe({
      next: (newV) => {
        this.vehiculeService.getAll().subscribe(vehicules => {
          this.vehicules = vehicules;
          this.creatingVehicule    = false;
          this.showCreateVehicule  = false;
          this.vehiculeForm.reset();
          // Auto-sélectionner le nouveau véhicule
          this.selectVehicule(newV);
          this.notify('Véhicule créé et sélectionné !');
        });
      },
      error: (err) => { 
        this.creatingVehicule = false; 
        const msg = err.error?.message || err.error || 'Erreur lors de la création du véhicule.';
        this.notifyError(msg); 
      },
    });
  }

  // ─── Pièces ──────────────────────────────────────────
  addPiece() {
    if (!this.pieceAjouter || this.qteAjouter < 1) return;
    const piece = this.allPieces.find(p => p.id === Number(this.pieceAjouter));
    if (!piece) return;
    
    const stockAtelier = piece.stockAtelier ?? 0;
    const stockMagasin = piece.stockMagasin ?? 0;
    
    const existing = this.lignesPieces.find(l => l.piece.id === piece.id);
    if (existing) {
      existing.quantite += this.qteAjouter;
      const manquantAtelier = Math.max(0, existing.quantite - stockAtelier);
      existing.aSortirMagasin = Math.min(manquantAtelier, stockMagasin);
      existing.manquant = Math.max(0, manquantAtelier - stockMagasin);
    } else {
      const manquantAtelier = Math.max(0, this.qteAjouter - stockAtelier);
      const aSortirMagasin = Math.min(manquantAtelier, stockMagasin);
      const manquantGlobal = Math.max(0, manquantAtelier - stockMagasin);
      
      this.lignesPieces.push({ 
        piece, 
        quantite: this.qteAjouter, 
        stockDisponible: stockAtelier + stockMagasin, 
        manquant: manquantGlobal,
        aSortirMagasin,
        stockAtelier
      });
    }
    this.pieceAjouter = null; this.qteAjouter = 1;
  }

  removePiece(idx: number) { this.lignesPieces.splice(idx, 1); }

  updateQtePiece(idx: number, qte: number) {
    const l = this.lignesPieces[idx];
    l.quantite = Math.max(1, qte);
    
    const stockAtelier = l.stockAtelier ?? 0;
    const stockMagasin = l.piece.stockMagasin ?? 0;
    const manquantAtelier = Math.max(0, l.quantite - stockAtelier);
    l.aSortirMagasin = Math.min(manquantAtelier, stockMagasin);
    l.manquant = Math.max(0, manquantAtelier - stockMagasin);
  }

  // ─── Main d'œuvre ─────────────────────────────────────
  addMO() {
    if (!this.moAjouter || this.qteAjouterMO < 1) return;
    const mo = this.allMO.find(m => m.id === Number(this.moAjouter));
    if (!mo) return;
    const existing = this.lignesMO.find(l => l.mo.id === mo.id);
    if (existing) { existing.quantite += this.qteAjouterMO; }
    else { this.lignesMO.push({ mo, quantite: this.qteAjouterMO }); }
    this.moAjouter = null; this.qteAjouterMO = 1;
  }

  removeMO(idx: number) { this.lignesMO.splice(idx, 1); }

  get hasRupture(): boolean { return this.lignesPieces.some(l => l.manquant > 0); }
  get rupturesOnly(): LignePiece[] { return this.lignesPieces.filter(l => l.manquant > 0); }

  // ─── Mécaniciens ─────────────────────────────────────
  isMecSelected(id: number): boolean { return this.selectedMecs.includes(id); }

  toggleMecStepper(mec: Mecanicien) {
    if (!this.editingId || this.mecToggling !== null) return;
    this.mecToggling = mec.id;
    const assigned = this.isMecSelected(mec.id);
    const req$ = assigned
      ? this.service.removeMecanicien(this.editingId, mec.id)
      : this.service.assignMecanicien(this.editingId, mec.id);
    req$.subscribe({
      next: () => {
        if (assigned) this.selectedMecs = this.selectedMecs.filter(id => id !== mec.id);
        else          this.selectedMecs  = [...this.selectedMecs, mec.id];
        this.mecToggling = null;
      },
      error: () => { this.mecToggling = null; },
    });
  }

  // ─── Bon de Commande ──────────────────────────────────
  closeBDCModal() { this.showBDCModal = false; }

  createBonDeCommande() {
    if (!this.bdcFournisseurId || !this.editingId) return;
    const fiche = this.fiches.find(f => f.id === this.editingId);
    const payload: BonDeCommandeRequest = {
      fournisseurId: Number(this.bdcFournisseurId),
      vehiculeId:    fiche?.vehicule?.id,
      tvaApplicable: false,
      observation:   `Commande liée à la fiche atelier #${this.step1Form.value.numero}`,
      lignes: this.rupturesOnly.map(l => ({ pieceDetacheeId: l.piece.id, quantite: l.manquant, prixUnitaire: l.piece.prix ?? 0 })),
    };
    this.bdcSaving = true;
    this.bdcService.create(payload).subscribe({
      next: () => { this.bdcSaving = false; this.showBDCModal = false; this.notify('Bon de commande créé !'); this.currentStep = 4; },
      error: () => { this.bdcSaving = false; this.notifyError('Erreur lors de la création du bon de commande.'); },
    });
  }



  // ─── Livraison ───────────────────────────────────────
  marquerLivre() {
    if (!this.editingId) return;
    this.saving = true;
    this.advanceStatutTo('LIVRE', () => { this.saving = false; this.closeWorkflow(); this.load(); this.notify('Véhicule livré !'); });
  }

  // ─── Panneau détail ───────────────────────────────────
  selectFiche(f: FicheAtelier) { this.selectedFiche = f === this.selectedFiche ? null : f; }
  closeDetail() { this.selectedFiche = null; }

  ficheInitials(f: FicheAtelier): string {
    return (f.vehicule?.immatriculation ?? 'FA').slice(0, 2).toUpperCase();
  }

  statutLabel(s: StatutReparation): string {
    return STATUT_STEPS.find(st => st.statut === s)?.label ?? s;
  }

  statutStepIndex(s: StatutReparation): number {
    return STATUT_STEPS.findIndex(st => st.statut === s);
  }

  statutColor(s: StatutReparation): string {
    const map: Record<StatutReparation | string, string> = {
      A_FAIRE: '#6b7280', EN_DIAGNOSTIC: '#f59e0b', EN_ATTENTE_PROFORMA: '#8b5cf6', EN_COURS: '#3b82f6', TERMINE: '#10b981', LIVRE: '#22c55e',
    };
    return map[s] ?? '#6b7280';
  }

  private statutToStep(s: StatutReparation | string): number {
    const map: Record<string, number> = {
      A_FAIRE: 1, EN_DIAGNOSTIC: 2, EN_ATTENTE_PROFORMA: 3, EN_COURS: 4, TERMINE: 5, LIVRE: 6,
    };
    return map[s] ?? 1;
  }

  // Raccourci : peut-on créer le bon de sortie ?
  get canCreateBDS(): boolean {
    return this.lignesPieces.length > 0 || this.lignesMO.length > 0;
  }

  // ─── Pagination ──────────────────────────────────────
  get paged(): FicheAtelier[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  // ─── Calculs ─────────────────────────────────────────
  get totalPieces(): number { return this.lignesPieces.reduce((s, l) => s + (l.piece.prix ?? 0) * l.quantite, 0); }
  get totalMO(): number { return this.lignesMO.reduce((s, l) => s + l.mo.prix * l.quantite, 0); }
  get grandTotal(): number { return this.totalPieces + this.totalMO; }

  formatPrice(n: number): string { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'; }
  formatDate(d: string | null): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }

  delete(id: number) {
    if (!confirm('Supprimer cette fiche atelier ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.notify('Fiche supprimée.'); if (this.selectedFiche?.id === id) this.selectedFiche = null; },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  private notify(msg: string) {
    this.saving = false; this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 4000);
  }
  private notifyError(msg: string) {
    this.saving = false; this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 4000);
  }
}
