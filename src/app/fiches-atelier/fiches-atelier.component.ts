import { Component, inject, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CommonModule, NgClass, NgStyle } from '@angular/common';
import { forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { FicheAtelierService, FicheAtelier, StatutFiche } from '../services/fiche-atelier.service';
import { VehiculeService, VehiculeModel } from '../services/vehicule.service';
import { MecanicienService, Mecanicien } from '../services/mecanicien.service';
import { PieceDetacheeService, PieceDetache } from '../services/piece-detachee.service';
import { MainDoeuvreService, MainDoeuvreModel } from '../services/main-doeuvre.service';
import { BonDeSortieService } from '../services/bon-de-sortie.service';
import { BonDeCommandeService, BonDeCommandeRequest } from '../services/bon-de-commande.service';
import { ProformaService } from '../services/proforma.service';
import { FactureService } from '../services/facture.service';
import { FournisseurService, FournisseurModel } from '../services/fournisseur.service';
import { ClientService, UserModel } from '../services/client.service';
import { AlertComponent } from '../shared/components/alert/alert.component';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../shared/components/searchable-select/searchable-select.component';

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

// ─── Constantes Checkboxes ──────────────────────────────
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

export const ELEMENTS_RECUS_FREQUENTS = [
  'Clé de contact',
  'Carte grise',
  'Documents du véhicule',
  'Cric',
  'Roue de secours',
  'Gilet de sécurité',
  'Triangle de signalisation',
  'Tapis de sol',
  'Antenne radio',
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

const STATUT_STEPS: { statut: StatutFiche; label: string }[] = [
  { statut: 'A_FAIRE', label: 'Réception' },
  { statut: 'EN_DIAGNOSTIC', label: 'Diagnostic' },
  { statut: 'EN_ATTENTE_PROFORMA', label: 'Pièces & MO' },
  { statut: 'PROFORMA_VALIDE', label: 'Proforma' },
  { statut: 'EN_ATTENTE_COMMANDE', label: 'Approv.' },
  { statut: 'EN_ATTENTE_SORTIE', label: 'Attente BS' },
  { statut: 'EN_ATTENTE_MECANICIEN', label: 'Assign. Méc.' },
  { statut: 'EN_COURS', label: 'Réparation' },
  { statut: 'EN_ATTENTE_PAIEMENT', label: 'Paiement' },
  { statut: 'TERMINE', label: 'Prêt' },
  { statut: 'LIVRE', label: 'Livré' },
];

@Component({
  selector: 'app-fiches-atelier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgClass, NgStyle, AlertComponent, PaginationComponent, SearchableSelectComponent],
  templateUrl: './fiches-atelier.component.html',
})
export class FichesAtelierComponent implements OnInit, OnDestroy {
  private service = inject(FicheAtelierService);
  private vehiculeService = inject(VehiculeService);
  private mecService = inject(MecanicienService);
  private pieceService = inject(PieceDetacheeService);
  private moService = inject(MainDoeuvreService);
  private bdcService = inject(BonDeCommandeService);
  private bdsService = inject(BonDeSortieService);
  private proformaService = inject(ProformaService);
  private factureService = inject(FactureService);
  private fournisseurSvc = inject(FournisseurService);
  private clientService = inject(ClientService);
  private fb = inject(FormBuilder);

  // ─── Liste ───────────────────────────────────────────
  fiches: FicheAtelier[] = [];
  loadedFiche: FicheAtelier | null = null;
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
  editingFicheStatus: string | null = null;
  currentStep = 1;
  saving = false;
  detailLoading = false;
  statutSteps = STATUT_STEPS;
  pollInterval: any;

  // ─── Constantes Checkboxes ────────────────────────────
  travauxFrequents = TRAVAUX_FREQUENTS;
  elementsRecusFrequents = ELEMENTS_RECUS_FREQUENTS;
  pannesFrequentes = PANNES_FREQUENTES;

  // ─── Checkbox sélections ──────────────────────────────
  selectedTravaux: string[] = [];
  autreTravaux = '';
  showAutreTravaux = false;

  selectedReception: string[] = [];
  autreReception = '';
  showAutreReception = false;

  selectedPannes: string[] = [];
  autrePannes = '';
  showAutrePannes = false;

  // Étape 1 — Réception
  step1Form: FormGroup = this.fb.group({
    numero: [''],
    vehiculeId: [null, Validators.required],
    listeReception: [''],
    descriptionTravaux: [''],
  });

  // Étape 2 — Diagnostic
  step2Form: FormGroup = this.fb.group({
    listeDefauts: [''],
  });

  // Étape 4 — Date de sortie estimée
  dateSortieEstimee = '';

  // ─── Filtres avancés ──────────────────────────────────
  filterStatut = '';
  filterDateDebut = '';
  filterDateFin = '';

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
    this.vehiculeSearch = v.immatriculation + ' — ' + v.marque + ' ' + v.modele;
    this.showVehiculeDropdown = false;
    this.step1Form.patchValue({ vehiculeId: v.id });
  }

  clearVehicule() {
    this.selectedVehicule = null;
    this.vehiculeSearch = '';
    this.showVehiculeDropdown = false;
    this.step1Form.patchValue({ vehiculeId: null });
  }

  // ─── Créer client inline ───────────────────────────────
  showCreateClient = false;
  creatingClient = false;
  clientForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: ['', Validators.required],
    email: [''],
    username: ['', Validators.required],
    password: ['', Validators.required],
    matricule: [''],
  });

  // ─── Créer véhicule inline ────────────────────────────
  showCreateVehicule = false;
  creatingVehicule = false;
  vehiculeForm: FormGroup = this.fb.group({
    immatriculation: ['', Validators.required],
    marque: ['', Validators.required],
    modele: ['', Validators.required],
    annee: [null],
    kilometrage: [null, Validators.required],
    numeroChassis: [''],
    clientId: [null],
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
    this.selectedVehiculeClient = c;
    this.vehiculeClientSearch = c.firstName + ' ' + c.lastName;
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
  proformaChargee: any = null;
  proformaSaving = false;

  // ─── Bon de Sortie ─────────────────────────────────────
  bdsCreating = false;

  // Track invoice creation from this fiche
  invoiceCreated = false;
  createdFacture: any = null;

  // Expose a safe proforma accessor for template (selectedFiche may not include proforma in the model)
  get selectedFicheProforma(): any | null {
    // prefer explicit proforma attached to the selected fiche, else fallback to the one fetched via service
    try {
      const pf = (this.selectedFiche as any)?.proforma;
      return pf ?? this.proformaChargee ?? null;
    } catch (e) { return this.proformaChargee ?? null; }
  }

  // Invoice accessor (either created in this session or attached to the selected fiche)
  get selectedFicheInvoice(): any | null {
    try {
      const inv = (this.selectedFiche as any)?.facture;
      return inv ?? this.createdFacture ?? null;
    } catch (e) { return this.createdFacture ?? null; }
  }

  get invoiceIsPaid(): boolean {
    const inv = this.selectedFicheInvoice ?? this.createdFacture;
    if (!inv) return false;
    if (inv.statutPaiement && (inv.statutPaiement === 'PAYE' || inv.statutPaiement === 'SOLDEE')) return true;
    if (inv.resteAPayer != null) {
      const reste = Number(inv.resteAPayer);
      return !isNaN(reste) && reste <= 0;
    }
    return false;
  }

  // Diagnostic control flags
  diagnosticStarted = false;
  diagnosticFinished = false;

  startDiagnostic() {
    if (!this.editingId) { this.notifyError('Aucune fiche sélectionnée.'); return; }
    if (this.diagnosticStarted) return;
    // Advance status to EN_DIAGNOSTIC
    this.saving = true;
    this.advanceStatutTo('EN_DIAGNOSTIC', () => {
      this.saving = false;
      this.diagnosticStarted = true;
      this.diagnosticFinished = false;
      this.notify('Diagnostic commencé.');
      this.load();
    });
  }

  finishDiagnostic() {
    if (!this.diagnosticStarted) { this.notifyError('Démarrez d\'abord le diagnostic.'); return; }
    this.diagnosticFinished = true;
    this.saveStep2ThenGoNext();
  }

  handleNextForStep1Or2() {
    if (this.currentStep === 1) { this.nextStep(); return; }
    // If diagnostic not started, start it
    if (!this.diagnosticStarted) { this.startDiagnostic(); return; }
    // If started but not finished, finish it
    if (this.diagnosticStarted && !this.diagnosticFinished) { this.finishDiagnostic(); return; }
    // Otherwise proceed with normal nextStep flow (this will call saveStep2ThenGoNext)
    this.nextStep();
  }

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  private referentielsLoaded = false;
  private loadReferentiels(callback: () => void) {
    if (this.referentielsLoaded) {
      callback();
      return;
    }
    this.loading = true;
    forkJoin({
      vehicules: this.vehiculeService.getAll(),
      mecaniciens: this.mecService.getAll(),
      pieces: this.pieceService.getAll(),
      mo: this.moService.getAll(),
      fournisseurs: this.fournisseurSvc.getAll(),
      clients: this.clientService.getAll(),
    }).subscribe({
      next: ({ vehicules, mecaniciens, pieces, mo, fournisseurs, clients }) => {
        this.vehicules = vehicules;
        this.allMecaniciens = mecaniciens;
        this.allPieces = pieces.filter(p => p.statut === 'ACTIF');
        this.allMO = mo.filter(m => !m.isArchived);
        this.fournisseurs = fournisseurs.filter(f => !f.archived);
        this.allClients = clients;
        this.referentielsLoaded = true;
        this.loading = false;
        callback();
      },
      error: () => {
        this.loading = false;
        this.notifyError('Erreur de chargement des référentiels');
      }
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.fiches = data.sort((a, b) => b.id - a.id);
        this.applyFilter();
        this.loading = false;

        if (this.selectedFiche) {
          this.selectedFiche = data.find(f => f.id === this.selectedFiche!.id) ?? null;
          if (this.selectedFiche) {
            this.editingFicheStatus = this.selectedFiche.statut;
          }
        }
      },
      error: () => this.notifyError('Erreur de chargement')
    });
  }

  // ─── Diagnostic (Étape 2) ────────────────────────────────
  searchKw = '';
  applyFilter() {
    const kw = this.searchKw.toLowerCase();
    let result = this.fiches;

    if (kw) {
      result = result.filter(f =>
        f.numero.toLowerCase().includes(kw) ||
        (f.vehicule?.immatriculation ?? '').toLowerCase().includes(kw) ||
        f.descriptionTravaux.toLowerCase().includes(kw) ||
        (f.statut ?? '').toLowerCase().includes(kw)
      );
    }

    if (this.filterStatut) {
      result = result.filter(f => f.statut === this.filterStatut);
    }

    if (this.filterDateDebut) {
      const debut = new Date(this.filterDateDebut);
      result = result.filter(f => new Date(f.dateCreation) >= debut);
    }

    if (this.filterDateFin) {
      const fin = new Date(this.filterDateFin);
      fin.setHours(23, 59, 59);
      result = result.filter(f => new Date(f.dateCreation) <= fin);
    }

    this.filtered = result;
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchKw = (e.target as HTMLInputElement).value;
    this.applyFilter();
  }

  onFilterStatut(e: Event) {
    this.filterStatut = (e.target as HTMLSelectElement).value;
    this.applyFilter();
  }

  // ─── Checkbox Toggles ──────────────────────────────────
  toggleTravaux(item: string) {
    const idx = this.selectedTravaux.indexOf(item);
    if (idx >= 0) this.selectedTravaux.splice(idx, 1);
    else this.selectedTravaux.push(item);
  }

  toggleReception(item: string) {
    const idx = this.selectedReception.indexOf(item);
    if (idx >= 0) this.selectedReception.splice(idx, 1);
    else this.selectedReception.push(item);
  }

  togglePannes(item: string) {
    const idx = this.selectedPannes.indexOf(item);
    if (idx >= 0) this.selectedPannes.splice(idx, 1);
    else this.selectedPannes.push(item);
  }

  private composeFromCheckboxes(selected: string[], autre: string): string {
    const parts = [...selected];
    if (autre.trim()) parts.push(autre.trim());
    return parts.join(', ');
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

  // ─── Ouverture Workflow ───────────────────────────────
  openNew() {
    this.loadReferentiels(() => {
      this.isNew = true;
      this.editingId = null;
      this.currentStep = 1;
      this.resetForms();
      this.showWorkflow = true;
    });
  }

  openEdit(f: FicheAtelier) {
    this.loadReferentiels(() => {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(() => { this.pollStatus(); }, 7000);

      const isSame = this.editingId === f.id;
      this.isNew = false;
      this.editingId = f.id;
      this.editingFicheStatus = f.statut;
      const trueStep = this.statutToStep(f.statut);

      if (!isSame || trueStep > this.currentStep) {
        this.currentStep = trueStep;
      }

      if (!isSame) {
        this.resetForms();
        this.step1Form.patchValue({
          numero: f.numero,
          vehiculeId: f.vehicule?.id ?? null,
          listeReception: f.listeReception ?? '',
          descriptionTravaux: f.descriptionTravaux,
        });

        // Décomposer les checkboxes depuis les textes existants
        const travauxDecomp = this.decomposeToCheckboxes(f.descriptionTravaux, TRAVAUX_FREQUENTS);
        this.selectedTravaux = travauxDecomp.selected;
        this.autreTravaux = travauxDecomp.autre;
        this.showAutreTravaux = this.autreTravaux.length > 0;

        const receptionDecomp = this.decomposeToCheckboxes(f.listeReception ?? '', ELEMENTS_RECUS_FREQUENTS);
        this.selectedReception = receptionDecomp.selected;
        this.autreReception = receptionDecomp.autre;
        this.showAutreReception = this.autreReception.length > 0;

        const pannesDecomp = this.decomposeToCheckboxes(f.listeDefauts ?? '', PANNES_FREQUENTES);
        this.selectedPannes = pannesDecomp.selected;
        this.autrePannes = pannesDecomp.autre;
        this.showAutrePannes = this.autrePannes.length > 0;

        this.step2Form.patchValue({
          listeDefauts: f.listeDefauts ?? '',
        });

        this.dateSortieEstimee = f.dateSortie ? f.dateSortie.substring(0, 10) : '';

        // Reconstituer les lignes pièces depuis la fiche atelier
        this.lignesPieces = (f.lignesFicheAtelierPieces || [])
          .map((lp: any) => {
            const piece = this.allPieces.find(pp => pp.id === lp.piece?.id);
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
          .filter((l: any) => l !== null) as LignePiece[];

        // Reconstituer les lignes MO depuis la fiche atelier
        this.lignesMO = (f.lignesFicheAtelierMainDoeuvres || [])
          .map((lmd: any) => {
            const mo = this.allMO.find(m => m.id === lmd.mainDoeuvre?.id);
            if (!mo) return null;
            return { mo, quantite: lmd.nbreHeure };
          })
          .filter((l: any): l is LigneMO => l !== null);

        if (f.vehicule) {
          const v = this.vehicules.find(vv => vv.id === f.vehicule!.id);
          if (v) {
            this.selectedVehicule = v;
            this.vehiculeSearch = v.immatriculation + ' — ' + v.marque + ' ' + v.modele;
          }
        }
        
        if (trueStep >= 7) {
          if (f.mecaniciensReparation && f.mecaniciensReparation.length > 0) {
            this.selectedMecs = f.mecaniciensReparation.map(m => m.id);
          } else {
            // Default to diagnostic mechanics if no reparation mechanics yet
            this.selectedMecs = f.mecaniciens ? f.mecaniciens.map(m => m.id) : [];
          }
        } else {
          this.selectedMecs = f.mecaniciens ? f.mecaniciens.map(m => m.id) : [];
        }

        // Restore local state for diagnostic
        if (f.statut === 'EN_DIAGNOSTIC') {
          this.diagnosticStarted = true;
          this.diagnosticFinished = false;
        } else if (trueStep >= 3) {
          this.diagnosticStarted = true;
          this.diagnosticFinished = true;
        } else {
          this.diagnosticStarted = false;
          this.diagnosticFinished = false;
        }
      }

      this.showWorkflow = true;

      // Load the full fiche to get relations like bonDeSortie
      this.service.getById(f.id).subscribe({
        next: (full) => { this.loadedFiche = full; },
        error: () => { }
      });

      // Try to fetch any existing proforma attached to this fiche atelier and any facture linked to it
      this.proformaChargee = null;
      this.invoiceCreated = false;
      this.createdFacture = null;
      try {
        this.proformaService.getByFicheAtelierId(f.id).subscribe({
          next: (p) => { this.proformaChargee = p; },
          error: () => { this.proformaChargee = null; }
        });
      } catch (e) { this.proformaChargee = null; }

      // Fetch invoices and try to find one linked to this fiche atelier
      try {
        this.factureService.getAll().subscribe({
          next: (list: any[]) => {
            if (!list || !list.length) return;
            const inv = list.find(it => (it.ficheAtelierId && it.ficheAtelierId === f.id) || (it.ficheAtelier && it.ficheAtelier.id === f.id));
            if (inv) {
              this.createdFacture = inv;
              this.invoiceCreated = true;
            }
          },
          error: () => { /* ignore */ }
        });
      } catch (e) { /* ignore */ }
    });
  }

  private resetForms() {
    this.step1Form.reset();
    this.step2Form.reset();
    this.lignesPieces = [];
    this.lignesMO = [];
    this.selectedMecs = [];
    this.selectedVehicule = null;
    this.vehiculeSearch = '';
    this.showVehiculeDropdown = false;
    this.showCreateClient = false;
    this.showCreateVehicule = false;
    this.clientForm.reset();
    this.vehiculeForm.reset();
    this.selectedVehiculeClient = null;
    this.vehiculeClientSearch = '';
    this.selectedTravaux = [];
    this.autreTravaux = '';
    this.showAutreTravaux = false;
    this.selectedReception = [];
    this.autreReception = '';
    this.showAutreReception = false;
    this.selectedPannes = [];
    this.autrePannes = '';
    this.showAutrePannes = false;
    this.dateSortieEstimee = '';
    this.proformaChargee = null;
  }

  closeWorkflow() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.showWorkflow = false;
    this.showBDCModal = false;
  }

  pollStatus() {
    if (!this.editingId || !this.showWorkflow) return;
    this.service.getById(this.editingId).subscribe({
      next: (f: FicheAtelier) => {
        this.loadedFiche = f;
        if (f.statut !== this.editingFicheStatus) {
          this.editingFicheStatus = f.statut;
          const trueStep = this.statutToStep(f.statut);
          if (trueStep > this.currentStep) {
            this.currentStep = trueStep;
            this.notify('Le statut de la fiche a été mis à jour en arrière-plan.');
            this.load();
          }
        }
      }
    });
  }

  // ─── Étapes : max steps selon mode ───────────────────
  get maxStep(): number {
    return 11;
  }

  get canNext(): boolean {
    if (this.currentStep === 1) {
      return this.step1Form.get('vehiculeId')?.valid === true
        && (this.selectedTravaux.length > 0 || this.autreTravaux.trim().length > 0);
    }

    // Step 2: only allow next when diagnostic is finished via explicit action
    if (this.currentStep === 2) return this.diagnosticFinished === true;

    // Step 9: only allow next if an invoice exists and is fully paid
    if (this.currentStep === 9) {
      const inv = this.selectedFicheInvoice;
      if (!inv) return false;
      // prefer statutPaiement if available, else check resteAPayer
      if ((inv.statutPaiement && (inv.statutPaiement === 'PAYE' || inv.statutPaiement === 'SOLDEE'))
        || (inv.resteAPayer != null && Number(inv.resteAPayer) <= 0)) {
        return true;
      }
      return false;
    }

    return true;
  }

  nextStep() {
    if (!this.canNext) { this.step1Form.markAllAsTouched(); return; }
    if (this.currentStep === 1) { this.saveStep1ThenGoNext(); return; }
    if (this.currentStep === 2) { this.saveStep2ThenGoNext(); return; }
    if (this.currentStep < 11) this.currentStep++;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  goToStep(n: number) {
    if (n < this.currentStep && !this.isNew) this.currentStep = n;
  }

  // ─── Étape 1 ─────────────────────────────────────────
  private saveStep1ThenGoNext() {
    const descriptionTravaux = this.composeFromCheckboxes(this.selectedTravaux, this.autreTravaux);
    const listeReception = this.composeFromCheckboxes(this.selectedReception, this.autreReception);

    if (!descriptionTravaux) {
      this.notifyError('Veuillez sélectionner au moins un travail demandé.');
      return;
    }

    const raw = this.step1Form.value;
    const payload = {
      numero: raw.numero,
      descriptionTravaux: descriptionTravaux,
      listeReception: listeReception || undefined,
      vehiculeId: Number(raw.vehiculeId),
      statut: 'A_FAIRE' as StatutFiche,
    };
    this.saving = true;
    const wasNew = this.isNew;
    const req$ = wasNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, { ...payload, statut: undefined });

    req$.subscribe({
      next: (f) => {
        this.saving = false;
        this.editingId = f.id;
        this.isNew = false;
        // Mettre à jour le numéro dans le formulaire
        this.step1Form.patchValue({ numero: f.numero });
        // Avancer au step 2 (mécaniciens) mais rester en A_FAIRE
        this.currentStep = 2;
        this.load();
        if (wasNew) this.notify('Fiche créée. Affectez les mécaniciens.');
      },
      error: (err) => {
        console.error('SAVE STEP 1 ERROR:', JSON.stringify(err.error));
        this.saving = false;
        this.notifyError(err.error?.message || 'Erreur lors de la sauvegarde.');
      },
    });
  }

  formatFournisseur(f: any): string {
    if (!f) return '';
    return f.nomEntreprise || (f.nom + ' ' + f.prenom);
  }

  formatPiece = (p: any) => {
    if (!p) return '';
    return p.reference + ' — ' + (p.categorie || '') + ' (Atelier: ' + (p.stockAtelier ?? 0) + ' | Magasin: ' + (p.stockMagasin ?? 0) + ')';
  };

  formatMO = (m: any) => {
    if (!m) return '';
    return (m.description || m.categorie?.nom || '') + ' (' + m.nbreHeure + 'h - ' + this.formatPrice(m.prix) + ')';
  };

  private saveStep2ThenGoNext() {
    if (this.selectedMecs.length === 0) {
      this.notifyError('Veuillez affecter au moins un mécanicien pour le diagnostic.');
      return;
    }

    this.saving = true;
    if (this.editingFicheStatus === 'A_FAIRE') {
      this.advanceStatutTo('EN_DIAGNOSTIC' as StatutFiche, () => {
        this.saving = false;
        this.notify('Diagnostic commencé.');
        this.load();
      });
    } else {
      this.service.updateStatut(this.editingId!, 'EN_ATTENTE_PROFORMA')
        .subscribe(() => {
          this.proformaSaving = false;
          this.notify('Diagnostic terminé. Veuillez sélectionner les pièces et main d\'œuvre.');
          this.currentStep = 3;
          this.load();
        });
    }
  }

  // ─── Pièces & Main d'œuvre (Nouvelle Étape 3) ──────────────────────
  savePiecesEtMo() {
    if (this.lignesPieces.length === 0 && this.lignesMO.length === 0) {
      this.notifyError('Veuillez ajouter au moins une pièce ou une main d\'œuvre.');
      return;
    }

    this.proformaSaving = true;

    const listeDefauts = this.composeFromCheckboxes(this.selectedPannes, this.autrePannes);
    const descriptionTravaux = this.composeFromCheckboxes(this.selectedTravaux, this.autreTravaux);
    const listeReception = this.composeFromCheckboxes(this.selectedReception, this.autreReception);

    this.service.update(this.editingId!, {
      numero: this.step1Form.value.numero,
      descriptionTravaux: descriptionTravaux || '',
      listeReception: listeReception || undefined,
      listeDefauts: listeDefauts || undefined,
      vehiculeId: Number(this.step1Form.value.vehiculeId),
      lignesPieces: this.lignesPieces.map(l => ({ pieceId: l.piece.id, quantite: l.quantite, prix: l.piece.prix ?? null })),
      lignesMainDoeuvres: this.lignesMO.map(l => ({ mainDoeuvreId: l.mo.id, nbreHeure: l.quantite, prix: l.mo.prix ?? null }))
    }).subscribe({
      next: () => {
        this.proformaSaving = false;
        this.proformaService.getByFicheAtelierId(this.editingId!).subscribe({
          next: (p: any) => {
            this.proformaChargee = p;
            const num = p.numero || p.code || ('DK-' + p.id);
            this.notify(`Pièces et main d'œuvre enregistrées. Proforma ${num} généré.`);
          },
          error: () => {
            this.notify('Pièces et main d\'œuvre enregistrées dans la fiche atelier.');
          }
        });
        this.currentStep = 4; // PROFORMA_VALIDE validation step
        this.load();
      },
      error: (err) => {
        this.proformaSaving = false;
        this.notifyError('Erreur lors de la sauvegarde : ' + (err.error?.message || ''));
      }
    });
  }

  // La proforma est validée par un autre acteur (client/secrétaire), le chef d'atelier attend le changement de statut.
  checkProformaValid() {
    if (!this.editingId) return;
    this.proformaSaving = true;
    this.service.getById(this.editingId).subscribe({
      next: (f: FicheAtelier) => {
        this.proformaSaving = false;
        if (f.statut !== 'EN_ATTENTE_PROFORMA') {
          this.editingFicheStatus = f.statut;
          this.currentStep = this.statutToStep(f.statut);
          this.notify('Le statut a été mis à jour.');
          this.load();
        } else {
          this.notifyError('Le proforma n\'est toujours pas validé par le client.');
        }
      },
      error: () => {
        this.proformaSaving = false;
        this.notifyError('Erreur lors de la vérification.');
      }
    });
  }

  advanceToApprov() {
    this.advanceStatutTo('EN_ATTENTE_COMMANDE', () => {
      this.currentStep = 5;
      this.load();
    });
  }

  // ─── Step 4 — Approvisionnement ────────────────────────
  get allPiecesDisponibles(): boolean {
    return this.lignesPieces.every(l => l.manquant === 0);
  }

  saveDateSortieEstimee() {
    if (!this.editingId || !this.dateSortieEstimee) return;
    this.saving = true;
    this.service.update(this.editingId, {
      numero: this.step1Form.value.numero,
      descriptionTravaux: this.composeFromCheckboxes(this.selectedTravaux, this.autreTravaux),
      vehiculeId: Number(this.step1Form.value.vehiculeId),
      dateSortie: this.dateSortieEstimee + 'T00:00:00',
    }).subscribe({
      next: () => { this.saving = false; this.notify('Date de sortie estimée enregistrée.'); this.load(); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la sauvegarde.'); }
    });
  }

  // ─── Bon de Sortie & Affectation (Étape 5) → Réparation (Étape 6) ─────────────
  generateBonDeSortie() {
    const ruptures = this.lignesPieces.filter(l => l.manquant > 0);
    if (ruptures.length > 0) {
      this.showBDCModal = true;
      return;
    }

    const aSortir = this.lignesPieces.filter(l => (l.aSortirMagasin || 0) > 0);
    if (aSortir.length > 0) {
      this.createBonDeSortie(aSortir);
    } else {
      // If nothing to pull from store, advance to assigning mechanics
      this.advanceStatutTo('EN_ATTENTE_MECANICIEN', () => {
        this.currentStep = 7;
        this.load();
      });
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
      vehiculeId: fiche.vehicule!.id,
      ficheAtelierId: fiche.id,
      lignesPieces: lignes.map(l => ({ pieceId: l.piece.id, quantite: l.aSortirMagasin!, prix: l.piece.prix ?? null })),
      remarque: `Bon de sortie automatique pour réparation FA-${this.editingId}`,
    }).subscribe({
      next: (bds: any) => {
        this.bdsCreating = false;
        this.notify(`Bon de sortie ${bds.reference || ''} créé. En attente de validation par le magasinier.`);
        this.advanceStatutTo('EN_ATTENTE_SORTIE', () => {
          this.currentStep = 6; // Attente BS
          this.load();
        });
      },
      error: (err: any) => {
        this.bdsCreating = false;
        this.notifyError(err.error?.message || 'Erreur création bon de sortie.');
      }
    });
  }

  checkAndStartReparation() {
    if (this.selectedMecs.length === 0) {
      this.notifyError('Veuillez affecter au moins un mécanicien.');
      return;
    }
    this.startReparation();
  }

  startReparation() {
    this.advanceStatutTo('EN_COURS', () => {
      this.currentStep = 8;
      this.load();
    });
  }

  checkCommandeValid() {
    if (!this.editingId) return;
    this.saving = true;
    this.service.getById(this.editingId).subscribe({
      next: (f: FicheAtelier) => {
        this.saving = false;
        if (f.statut !== 'EN_ATTENTE_COMMANDE') {
          this.editingFicheStatus = f.statut;
          this.currentStep = this.statutToStep(f.statut);
          this.notify('Le statut a été mis à jour.');
          this.load();
        } else {
          this.notifyError('La commande n\'est pas encore validée ou réceptionnée.');
        }
      },
      error: () => {
        this.saving = false;
        this.notifyError('Erreur de vérification.');
      }
    });
  }

  checkBonDeSortieValid() {
    if (!this.editingId) return;
    this.saving = true;
    this.service.getById(this.editingId).subscribe({
      next: (f: FicheAtelier) => {
        this.saving = false;
        if (f.statut !== 'EN_ATTENTE_SORTIE') {
          this.editingFicheStatus = f.statut;
          this.currentStep = this.statutToStep(f.statut);
          this.notify('Le statut a été mis à jour.');
          this.load();
        } else {
          this.notifyError('Le bon de sortie n\'est toujours pas validé par le magasinier.');
        }
      },
      error: () => { this.saving = false; this.notifyError('Impossible de vérifier le statut.'); }
    });
  }

  checkPaiementValid() {
    if (!this.editingId) return;
    this.saving = true;
    this.service.getById(this.editingId).subscribe({
      next: (f: FicheAtelier) => {
        this.saving = false;
        if (f.statut !== 'EN_ATTENTE_PAIEMENT') {
          this.editingFicheStatus = f.statut;
          this.currentStep = this.statutToStep(f.statut);
          this.notify('Le statut a été mis à jour.');
          this.load();
        } else {
          this.notifyError('La facture n\'est toujours pas payée.');
        }
      },
      error: () => { this.saving = false; this.notifyError('Impossible de vérifier le statut.'); }
    });
  }

  terminerReparation() {
    this.saving = true;
    this.advanceStatutTo('EN_ATTENTE_PAIEMENT', () => {
      this.saving = false;
      this.currentStep = 9;
      this.notify('Réparation terminée. Veuillez procéder au paiement.');
      this.load();
    });
  }

  private advanceStatutTo(statut: StatutFiche, cb: () => void) {
    if (!this.editingId) { cb(); return; }
    this.service.updateStatut(this.editingId, statut).subscribe({
      next: () => cb(),
      error: (err) => {
        console.error('PATCH STATUT ERROR:', err);
        cb();
      }
    });
  }

  // ─── Création de facture depuis la fiche atelier ─────────────────
  createFactureFromFiche() {
    if (!this.editingId) { this.notifyError('Fiche non sélectionnée.'); return; }
    const fiche = this.fiches.find(x => x.id === this.editingId);
    if (!fiche) { this.notifyError('Fiche introuvable.'); return; }
    const vehId = fiche.vehicule?.id;
    const clientId = fiche.vehicule?.client?.id;
    if (!clientId || !vehId) { this.notifyError('Données client ou véhicule manquantes sur cette fiche.'); return; }

    const payload = {
      clientId: Number(clientId),
      vehiculeId: Number(vehId),
      ficheAtelierId: Number(this.editingId),
      appliquerTVA: true,
      appliquerTimbre: true,
      modePaiement: 'ESPECE'
    };

    this.saving = true;
    // use FactureService.create
    try {
      this.factureService.create(payload).subscribe({
        next: (res: any) => {
          this.saving = false;
          this.invoiceCreated = true;
          this.createdFacture = res;
          this.notify('Facture créée depuis la fiche atelier.');
          // refresh lists
          this.load();
          // advance to next step to reflect payment/validation
          // Do NOT advance automatically — business rule: remain on payment step until invoice is paid.
        },
        error: (err: any) => {
          this.saving = false;
          const msg = err?.error?.message || 'Erreur lors de la création de la facture.';
          this.notifyError(msg);
        }
      });
    } catch (e) {
      this.saving = false;
      this.notifyError('Impossible de créer la facture : service indisponible.');
    }
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
      lastName: v.lastName,
      phone: v.phone,
      email: v.email || v.username + '@oas.sn',
      username: v.username,
      password: v.password,
      matricule: v.matricule || 'CLI-' + Date.now(),
      type: 'CLIENT'
    };
    this.clientService.create(payload).subscribe({
      next: () => {
        this.clientService.getAll().subscribe(clients => {
          this.allClients = clients;
          this.creatingClient = false;
          this.showCreateClient = false;
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
      this.vehiculeClientSearch = '';
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
      marque: v.marque,
      modele: v.modele,
      annee: v.annee || null,
      kilometrage: v.kilometrage || null,
      numeroChassis: v.numeroChassis || '',
      clientId: v.clientId || null,
    }).subscribe({
      next: (newV) => {
        this.vehiculeService.getAll().subscribe(vehicules => {
          this.vehicules = vehicules;
          this.creatingVehicule = false;
          this.showCreateVehicule = false;
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
    this.pieceAjouter = null;
    this.qteAjouter = 1;
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
  
  getTotalASortir(): number {
    return this.lignesPieces.reduce((acc, l) => acc + (l.aSortirMagasin || 0), 0);
  }

  // ─── Mécaniciens ─────────────────────────────────────
  isMecSelected(id: number): boolean { return this.selectedMecs.includes(id); }

  toggleMecStepper(mec: Mecanicien) {
    if (!this.editingId || this.mecToggling !== null) return;
    this.mecToggling = mec.id;
    const assigned = this.isMecSelected(mec.id);
    
    let req$;
    if (this.currentStep === 7) {
      req$ = assigned
        ? this.service.removeMecanicienReparation(this.editingId, mec.id)
        : this.service.assignMecanicienReparation(this.editingId, mec.id);
    } else {
      req$ = assigned
        ? this.service.removeMecanicien(this.editingId, mec.id)
        : this.service.assignMecanicien(this.editingId, mec.id);
    }

    req$.subscribe({
      next: () => {
        if (assigned) this.selectedMecs = this.selectedMecs.filter(id => id !== mec.id);
        else this.selectedMecs = [...this.selectedMecs, mec.id];
        this.mecToggling = null;
      },
      error: () => { this.mecToggling = null; },
    });
  }

  // ─── Bon de Commande (sans fournisseur) ───────────────
  closeBDCModal() { this.showBDCModal = false; }

  createBonDeCommande() {
    if (!this.editingId) return;
    const fiche = this.fiches.find(f => f.id === this.editingId);
    const payload: BonDeCommandeRequest = {
      fournisseurId: null, // Pas de fournisseur — sera assigné plus tard
      vehiculeId: fiche?.vehicule?.id,
      tvaApplicable: false,
      observation: `Commande liée à la fiche atelier #${this.step1Form.value.numero}`,
      lignes: this.rupturesOnly.map(l => ({ pieceDetacheeId: l.piece.id, quantite: l.manquant, prixUnitaire: l.piece.prix ?? 0 })),
    };
    this.bdcSaving = true;
    this.bdcService.create(payload).subscribe({
      next: () => {
        this.bdcSaving = false;
        this.showBDCModal = false;
        this.notify('Bon de commande créé en attente. Allez dans « Bons de commande » pour assigner un fournisseur.');
        this.advanceStatutTo('EN_ATTENTE_COMMANDE', () => {
          this.currentStep = 5;
          this.load();
        });
      },
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
  selectFiche(f: FicheAtelier) {
    if (this.selectedFiche && this.selectedFiche.id === f.id) {
      this.selectedFiche = null;
      return;
    }
    this.detailLoading = true;
    this.selectedFiche = null; // Hide current while loading
    this.service.getById(f.id).subscribe({
      next: (fullFiche: FicheAtelier) => {
        this.selectedFiche = fullFiche;
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
        this.notifyError('Erreur de chargement des détails de la fiche');
      }
    });
  }
  closeDetail() { this.selectedFiche = null; }

  ficheInitials(f: FicheAtelier): string {
    return (f.vehicule?.immatriculation ?? 'FA').slice(0, 2).toUpperCase();
  }

  statutLabel(s: StatutFiche): string {
    return STATUT_STEPS.find(st => st.statut === s)?.label ?? s;
  }

  statutStepIndex(s: StatutFiche): number {
    return STATUT_STEPS.findIndex(st => st.statut === s);
  }

  statutColor(s: StatutFiche | string): string {
    const map: Record<string, string> = {
      A_FAIRE: '#6b7280', EN_DIAGNOSTIC: '#f59e0b', EN_ATTENTE_PROFORMA: '#8b5cf6',
      PROFORMA_VALIDE: '#a855f7', EN_ATTENTE_COMMANDE: '#ec4899', EN_ATTENTE_SORTIE: '#eab308',
      EN_COURS: '#3b82f6', EN_ATTENTE_PAIEMENT: '#ef4444', TERMINE: '#10b981', LIVRE: '#22c55e',
    };
    return map[s as string] ?? '#6b7280';
  }

  private statutToStep(s: StatutFiche | string): number {
    if (s === 'EN_ATTENTE_PROFORMA') {
      if (this.proformaChargee || this.selectedFicheProforma) return 4;
      return 3;
    }
    if (s === 'PROFORMA_VALIDE') return 5;

    const idx = STATUT_STEPS.findIndex(x => x.statut === s);
    return idx >= 0 ? idx + 1 : 1;
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
