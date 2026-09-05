import { Component, inject, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { CommonModule, NgClass, NgStyle } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { OrdreReparationService, OrdreReparation, StatutFiche } from './ordre-reparation.service';
import { VehiculeService, VehiculeModel } from '../vehicules/vehicule.service';
import { TechnicienService, Technicien } from '../techniciens/technicien.service';
import { Specialite } from '../techniciens/models/technicien.model';
import { PieceDetacheeService, PieceDetache } from '../pieces-detachees/piece-detachee.service';
import { MainDoeuvreService, MainDoeuvreModel } from '../main-doeuvre/main-doeuvre.service';
import { BonDeSortieService } from '../bons-de-sortie/bon-de-sortie.service';
import { BonDeCommandeService, BonDeCommandeRequest } from '../bons-commande/bon-de-commande.service';
import { ProformaService } from '../proforma/proforma.service';
import { FactureService } from '../factures/facture.service';
import { FournisseurService, FournisseurModel } from '../fournisseurs/fournisseur.service';
import { ClientService, UserModel } from '../clients/client.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { MediaUploaderComponent } from '../../shared/components/media-uploader/media-uploader.component';
import { CloudinaryUploadResult } from '../../shared/models';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { extractContent } from '../../shared/models';
import { PieceJointeDiagnostic, TypePieceJointeDiagnostic, RemarqueDiagnostic } from './ordre-reparation.service';
import { LigneReceptionOrdre, LigneTravailOrdre } from './models/ordre-reparation.model';

export interface LignePiece {
  isCustom?: boolean;
  piece?: PieceDetache;
  pieceIdTemp?: number; // Used for UI select model
  designationPds?: string;
  prixUnitaire?: number; // Used for custom piece price
  quantite: number;
  stockDisponible?: number;
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

export const SPECIALITES_TECHNICIEN: { value: Specialite; label: string }[] = [
  { value: 'MECANIQUE_GENERALE', label: 'Mécanique générale' },
  { value: 'ELECTRICITE_AUTO', label: 'Électricité auto' },
  { value: 'CARROSSERIE_PEINTURE', label: 'Carrosserie / Peinture' },
  { value: 'TOLERIE', label: 'Tôlerie' },
  { value: 'CLIMATISATION', label: 'Climatisation' },
  { value: 'DIAGNOSTIC_ELECTRONIQUE', label: 'Diagnostic électronique' },
  { value: 'PNEUMATIQUE', label: 'Pneumatique' },
];

const STATUT_STEPS: { statut: StatutFiche; label: string }[] = [
  { statut: 'A_FAIRE', label: 'Réception' },
  { statut: 'EN_DIAGNOSTIC', label: 'Diagnostic' },
  { statut: 'EN_ATTENTE_PROFORMA', label: 'Pièces & MO' },
  { statut: 'PROFORMA_VALIDE', label: 'Proforma' },
  { statut: 'EN_ATTENTE_COMMANDE', label: 'Approv.' },
  { statut: 'EN_ATTENTE_SORTIE', label: 'Attente BS' },
  { statut: 'EN_ATTENTE_MECANICIEN', label: 'Assign. Tech.' },
  { statut: 'EN_COURS', label: 'Réparation' },
  { statut: 'EN_ATTENTE_PAIEMENT', label: 'Paiement' },
  { statut: 'TERMINE', label: 'Prêt' },
  { statut: 'LIVRE', label: 'Livré' },
];

@Component({
  selector: 'app-ordres-reparation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgClass, NgStyle, RouterLink, AlertComponent, PaginationComponent, SearchableSelectComponent, MediaUploaderComponent],
  templateUrl: './ordres-reparation.component.html',
})
export class OrdresReparationComponent extends BasePaginatedComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(OrdreReparationService);
  private vehiculeService = inject(VehiculeService);
  private technicienService = inject(TechnicienService);
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
  fiches: OrdreReparation[] = [];
  loadedFiche: OrdreReparation | null = null;
  filtered: OrdreReparation[] = [];
  loading = true;
  successMessage = '';
  errorMessage = '';
  selectedFiche: OrdreReparation | null = null;

  // ─── Référentiels ─────────────────────────────────────
  vehicules: VehiculeModel[] = [];
  allClients: UserModel[] = [];
  allTechniciens: Technicien[] = [];
  readonly specialitesTechnicien = SPECIALITES_TECHNICIEN;
  // Filtre par spécialité pour l'affectation des techniciens au diagnostic (étape 2).
  specialiteFiltreDiagnostic: Specialite | '' = '';
  get techniciensDiagnosticFiltres(): Technicien[] {
    if (!this.specialiteFiltreDiagnostic) return this.allTechniciens;
    return this.allTechniciens.filter(t => t.specialite === this.specialiteFiltreDiagnostic);
  }
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
  pannesFrequentes = PANNES_FREQUENTES;

  // ─── Checkbox sélections ──────────────────────────────
  selectedTravaux: string[] = [];
  autreTravaux = '';
  showAutreTravaux = false;

  selectedPannes: string[] = [];
  autrePannes = '';
  showAutrePannes = false;

  // Remarques de diagnostic (depuis les techniciens)
  remarquesDiagnostic: RemarqueDiagnostic[] = [];

  // Étape 1 — Réception (simple récapitulatif texte, cf. spec point 1) +
  // Travaux demandés (texte libre, cf. spec point 2)
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

  /** Même principe que les lignes de réception : la ligne issue de la désignation des
   *  travaux de la fiche atelier est verrouillée, les lignes ajoutées restent éditables. */
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

  addLigneTravail() {
    this.lignesTravaux.push(this.buildLigneTravailGroup({ nom: '', verrouille: false }));
  }

  removeLigneTravail(index: number) {
    if (this.lignesTravaux.at(index)?.get('verrouille')?.value) return;
    this.lignesTravaux.removeAt(index);
  }

  /** Lignes verrouillées (issues de la fiche atelier) non modifiables/supprimables ;
   *  les nouvelles lignes ajoutées via "Ajouter une ligne" restent éditables. */
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

  addLigneReception() {
    this.lignesReception.push(this.buildLigneReceptionGroup({ nom: '', etat: null, verrouille: false }));
  }

  removeLigneReception(index: number) {
    if (this.lignesReception.at(index)?.get('verrouille')?.value) return;
    this.lignesReception.removeAt(index);
  }

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

  isLoadingFacture = false;
  isLoadingProforma = false;

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
  selectedTechniciens: number[] = [];
  technicienToggling: number | null = null;
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
      p.designation.toLowerCase().includes(q) ||
      (p.categorie ?? '').toLowerCase().includes(q) ||
      (p.reference ?? '').toLowerCase().includes(q)
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

  private doSaveFicheData(callback: () => void, errorCallback?: (err: any) => void) {
    if (!this.editingId) return;
    const listeDefauts = this.composeFromCheckboxes(this.selectedPannes, this.autrePannes);
    const descriptionTravaux = this.composeFromCheckboxes(this.selectedTravaux, this.autreTravaux);

    this.service.update(this.editingId, {
      numero: this.step1Form.value.numero,
      descriptionTravaux: descriptionTravaux || '',
      lignesTravaux: this.lignesTravaux.getRawValue() as LigneTravailOrdre[],
      lignesReception: this.lignesReception.getRawValue() as LigneReceptionOrdre[],
      listeDefauts: listeDefauts || undefined,
      vehiculeId: Number(this.step1Form.value.vehiculeId),
      lignesPieces: this.lignesPieces.map(l => ({
        pieceId: (l.isCustom ? null : (l.piece?.id || l.pieceIdTemp)) as any,
        quantite: l.quantite,
        prix: (l.isCustom ? l.prixUnitaire : (l.piece?.prix ?? null)) as any,
        isCustom: l.isCustom,
        custom: l.isCustom,
        designationPds: l.designationPds
      })),
      lignesMainDoeuvres: this.lignesMO.map(l => ({ mainDoeuvreId: l.mo.id, nbreHeure: l.quantite, prix: l.mo.prix ?? null }))
    }).subscribe({
      next: callback,
      error: errorCallback || ((err) => {
        this.notifyError('Erreur lors de la sauvegarde : ' + (err.error?.message || ''));
      })
    });
  }

  // Diagnostic control flags
  diagnosticStarted = false;
  diagnosticFinished = false;

  // Au moins un technicien (mécanicien) doit être affecté avant de pouvoir démarrer
  // le diagnostic (cf. spec point 4). Utilisé pour désactiver le bouton côté template.
  get canStartDiagnostic(): boolean {
    return this.selectedTechniciens.length > 0 && !this.diagnosticStarted && !this.saving;
  }

  startDiagnostic() {
    if (!this.editingId) { this.notifyError('Aucune fiche sélectionnée.'); return; }
    if (this.diagnosticStarted) return;
    if (this.selectedTechniciens.length === 0) {
      this.notifyError('Veuillez affecter au moins un technicien avant de démarrer le diagnostic.');
      return;
    }
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

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    this.loadData();

    this.route.queryParams.subscribe((params: any) => {
      const ficheAtelierId = params['ficheAtelierId'];
      if (ficheAtelierId) {
        // Tente de créer l'OR (ou d'en récupérer un existant si le backend le permettait)
        this.service.createFromFicheAtelier(+ficheAtelierId).subscribe({
          next: (newOr) => {
            // Nettoie l'URL pour ne pas reboucler au rechargement
            this.router.navigate([], { queryParams: { ficheAtelierId: null }, queryParamsHandling: 'merge' });
            // Ouvre le modal directement
            this.openEdit(newOr);
          },
          error: (err) => {
            this.router.navigate([], { queryParams: { ficheAtelierId: null }, queryParamsHandling: 'merge' });
            if (err?.status === 409) {
              this.notifyError("Un ordre de réparation existe déjà pour cette fiche.");
            } else {
              this.notifyError("Erreur lors de la création de l'ordre de réparation.");
            }
          }
        });
      }
    });
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
      // vehicules: this.vehiculeService.getAll(),
      techniciens: this.technicienService.getAll(),
      pieces: this.pieceService.getAll(),
      mo: this.moService.getAll(),
      // fournisseurs: this.fournisseurSvc.getAll(),
      // clients: this.clientService.getAll(),
    }).subscribe({
      next: ({ techniciens, pieces, mo }) => {
        // this.vehicules = extractContent<VehiculeModel>(vehicules as any);
        this.allTechniciens = techniciens;
        this.allPieces = extractContent<PieceDetache>(pieces as any).filter(p => p.statut === 'ACTIF');
        this.allMO = extractContent<MainDoeuvreModel>(mo as any).filter(m => !m.isArchived);
        // this.fournisseurs = extractContent<FournisseurModel>(fournisseurs as any).filter(f => !f.archived);
        // this.allClients = extractContent<UserModel>(clients as any);
        this.referentielsLoaded = true;
        this.loading = false; this.cdr.markForCheck();
        callback();
      },
      error: () => {
        this.loading = false; this.cdr.markForCheck();
        this.notifyError('Erreur de chargement des référentiels');
      }
    });
  }

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getAll(this.getPageParams()).subscribe({
      next: (data) => {
        const arr = this.applyPageResponse<OrdreReparation>(data);
        this.fiches = arr.sort((a, b) => b.id - a.id);
        this.applyFilter(); this.cdr.markForCheck();
        this.loading = false; this.cdr.markForCheck();

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

  override onSearch(e: Event) {
    this.searchKw = (e.target as HTMLInputElement).value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  onFilterStatut(e: Event) {
    this.filterStatut = (e.target as HTMLSelectElement).value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  // ─── Checkbox Toggles ──────────────────────────────────
  toggleTravaux(item: string) {
    const idx = this.selectedTravaux.indexOf(item);
    if (idx >= 0) this.selectedTravaux.splice(idx, 1);
    else this.selectedTravaux.push(item);
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
      this.remarquesDiagnostic = [];
      this.resetForms();
      this.showWorkflow = true;
    });
  }

  openEdit(f: OrdreReparation) {
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
          descriptionTravaux: f.descriptionTravaux,
        });
        this.setLignesReception(f.lignesReception);
        this.setLignesTravaux(f.lignesTravaux);

        // Décomposer les checkboxes depuis les textes existants
        const travauxDecomp = this.decomposeToCheckboxes(f.descriptionTravaux, TRAVAUX_FREQUENTS);
        this.selectedTravaux = travauxDecomp.selected;
        this.autreTravaux = travauxDecomp.autre;
        this.showAutreTravaux = this.autreTravaux.length > 0;

        this.lignesPieces = (f.lignesOrdreReparationPieces || []).map((l: any) => {
          return {
            piece: l.piece,
            pieceIdTemp: l.piece?.id,
            quantite: l.quantite,
            isCustom: l.isCustom,
            designationPds: l.designationPds,
            prixUnitaire: l.prix,
            stockDisponible: l.isCustom ? 0 : (l.piece?.stockMagasin ?? 0) + (l.piece?.stockAtelier ?? 0),
            manquant: l.isCustom ? 0 : Math.max(0, l.quantite - (l.piece?.stockAtelier ?? 0)),
            aSortirMagasin: l.isCustom ? 0 : (Math.max(0, l.quantite - (l.piece?.stockAtelier ?? 0)) > 0 ? 0 : 1)
          };
        });

        const pannesDecomp = this.decomposeToCheckboxes(f.listeDefauts ?? '', PANNES_FREQUENTES);
        this.selectedPannes = pannesDecomp.selected;
        this.autrePannes = pannesDecomp.autre;
        this.showAutrePannes = this.autrePannes.length > 0;

        this.step2Form.patchValue({
          listeDefauts: f.listeDefauts ?? '',
        });

        this.dateSortieEstimee = f.dateSortie ? f.dateSortie.substring(0, 10) : '';

        // Reconstituer les lignes MO depuis la ordre de réparation
        this.lignesMO = (f.lignesOrdreReparationMainDoeuvres || [])
          .map((lmd: any) => {
            const mo = this.allMO.find(m => m.id === lmd.mainDoeuvre?.id);
            if (!mo) return null;
            return { mo, quantite: lmd.nbreHeure };
          })
          .filter((l: any): l is LigneMO => l !== null);

        if (f.vehicule) {
          // const v = this.vehicules.find(vv => vv.id === f.vehicule!.id);
          this.selectedVehicule = f.vehicule as any;
          this.step1Form.patchValue({ vehiculeId: f.vehicule.id });
        }

        if (trueStep >= 7) {
          if (f.techniciensReparation && f.techniciensReparation.length > 0) {
            this.selectedTechniciens = f.techniciensReparation.map(m => m.id);
          } else {
            // Default to diagnostic mechanics if no reparation mechanics yet
            this.selectedTechniciens = f.techniciens ? f.techniciens.map(m => m.id) : [];
          }
        } else {
          this.selectedTechniciens = f.techniciens ? f.techniciens.map(m => m.id) : [];
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

      // Charger la fiche complète : la liste (source de `f`) est un DTO allégé qui n'inclut pas
      // lignesReception/lignesTravaux/mecaniciens/lignes — on repatch donc le formulaire et l'état
      // dérivé avec cette version complète une fois reçue (et pas avec `f`), pour ne pas perdre ces
      // champs à la réouverture d'une fiche existante.
      this.service.getById(f.id).subscribe({
        next: (full) => {
          this.loadedFiche = full;
          this.loadRemarquesDiagnostic(full.id);
          if (!isSame) {
            this.step1Form.patchValue({
              numero: full.numero,
              vehiculeId: full.vehicule?.id ?? null,
              descriptionTravaux: full.descriptionTravaux,
            });
            this.setLignesReception(full.lignesReception);
            this.setLignesTravaux(full.lignesTravaux);

            // Décomposer les checkboxes depuis les textes existants
            const travauxDecomp = this.decomposeToCheckboxes(full.descriptionTravaux, TRAVAUX_FREQUENTS);
            this.selectedTravaux = travauxDecomp.selected;
            this.autreTravaux = travauxDecomp.autre;
            this.showAutreTravaux = this.autreTravaux.length > 0;

            this.lignesPieces = (full.lignesOrdreReparationPieces || []).map((l: any) => {
              return {
                piece: l.piece,
                pieceIdTemp: l.piece?.id,
                quantite: l.quantite,
                isCustom: l.isCustom,
                designationPds: l.designationPds,
                prixUnitaire: l.prix,
                stockDisponible: l.isCustom ? 0 : (l.piece?.stockMagasin ?? 0) + (l.piece?.stockAtelier ?? 0),
                manquant: l.isCustom ? 0 : Math.max(0, l.quantite - (l.piece?.stockAtelier ?? 0)),
                aSortirMagasin: l.isCustom ? 0 : (Math.max(0, l.quantite - (l.piece?.stockAtelier ?? 0)) > 0 ? 0 : 1)
              };
            });

            const pannesDecomp = this.decomposeToCheckboxes(full.listeDefauts ?? '', PANNES_FREQUENTES);
            this.selectedPannes = pannesDecomp.selected;
            this.autrePannes = pannesDecomp.autre;
            this.showAutrePannes = this.autrePannes.length > 0;

            this.step2Form.patchValue({
              listeDefauts: full.listeDefauts ?? '',
            });

            this.dateSortieEstimee = full.dateSortie ? full.dateSortie.substring(0, 10) : '';

            // Reconstituer les lignes MO depuis la ordre de réparation
            this.lignesMO = (full.lignesOrdreReparationMainDoeuvres || [])
              .map((lmd: any) => {
                const mo = this.allMO.find(m => m.id === lmd.mainDoeuvre?.id);
                if (!mo) return null;
                return { mo, quantite: lmd.nbreHeure };
              })
              .filter((l: any): l is LigneMO => l !== null);

            if (full.vehicule) {
              // const v = this.vehicules.find(vv => vv.id === full.vehicule!.id);
              this.selectedVehicule = full.vehicule as any;
              this.step1Form.patchValue({ vehiculeId: full.vehicule.id });
            }

            if (trueStep >= 7) {
              if (full.techniciensReparation && full.techniciensReparation.length > 0) {
                this.selectedTechniciens = full.techniciensReparation.map(m => m.id);
              } else {
                // Default to diagnostic mechanics if no reparation mechanics yet
                this.selectedTechniciens = full.techniciens ? full.techniciens.map(m => m.id) : [];
              }
            } else {
              this.selectedTechniciens = full.techniciens ? full.techniciens.map(m => m.id) : [];
            }

            // Restore local state for diagnostic
            if (full.statut === 'EN_DIAGNOSTIC') {
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
        },
        error: () => { }
      });

      this.loadPiecesJointesDiagnostic();

      // Try to fetch any existing proforma attached to this ordre de réparation and any facture linked to it
      this.proformaChargee = null;
      this.invoiceCreated = false;
      this.createdFacture = null;
      this.isLoadingProforma = true;
      try {
        this.proformaService.getByOrdreReparationId(f.id).subscribe({
          next: (p) => {
            this.proformaChargee = p;
            this.isLoadingProforma = false;
            if (this.editingFicheStatus === 'EN_ATTENTE_PROFORMA' && this.currentStep === 3) {
              this.currentStep = 4;
            }
          },
          error: () => { this.proformaChargee = null; this.isLoadingProforma = false; }
        });
      } catch (e) { this.proformaChargee = null; this.isLoadingProforma = false; }

      // Fetch invoices and try to find one linked to this ordre de réparation
      this.isLoadingFacture = true;
      try {
        this.factureService.getAll().subscribe({
          next: (list: any[]) => {
            this.isLoadingFacture = false;
            if (!list || !list.length) return;
            const inv = list.find(it =>
              (it.ordreReparationId && Number(it.ordreReparationId) === Number(f.id)) ||
              (it.ordreReparation && Number(it.ordreReparation.id) === Number(f.id))
            );
            if (inv) {
              this.createdFacture = inv;
              this.invoiceCreated = true;
            }
          },
          error: () => { this.isLoadingFacture = false; }
        });
      } catch (e) { this.isLoadingFacture = false; }
    });
  }

  private resetForms() {
    this.step1Form.reset();
    this.lignesReception.clear();
    this.lignesTravaux.clear();
    this.step2Form.reset();
    this.lignesPieces = [];
    this.lignesMO = [];
    this.selectedTechniciens = [];
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
    this.selectedPannes = [];
    this.autrePannes = '';
    this.showAutrePannes = false;
    this.dateSortieEstimee = '';
    this.proformaChargee = null;
    this.piecesJointesDiagnostic = [];
    this.piecesJointesFilterType = '';
  }

  closeWorkflow() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.showWorkflow = false;
    this.showBDCModal = false;
  }

  pollStatus() {
    if (!this.editingId || !this.showWorkflow) return;
    this.service.getById(this.editingId).subscribe({
      next: (f: OrdreReparation) => {
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

    if (!descriptionTravaux) {
      this.notifyError('Veuillez sélectionner au moins un travail demandé.');
      return;
    }

    const raw = this.step1Form.value;
    const payload = {
      numero: raw.numero,
      descriptionTravaux: descriptionTravaux,
      lignesTravaux: this.lignesTravaux.getRawValue() as LigneTravailOrdre[],
      lignesReception: this.lignesReception.getRawValue() as LigneReceptionOrdre[],
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
        this.loadPiecesJointesDiagnostic();
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
    return p.designation + ' — ' + (p.categorie || '') + ' (Atelier: ' + (p.stockAtelier ?? 0) + ' | Magasin: ' + (p.stockMagasin ?? 0) + ')';
  };

  formatMO = (m: any) => {
    if (!m) return '';
    return (m.description || m.categorie?.nom || '') + ' (' + m.nbreHeure + 'h - ' + this.formatPrice(m.prix) + ')';
  };

  private saveStep2ThenGoNext() {
    if (this.selectedTechniciens.length === 0) {
      this.notifyError('Veuillez affecter au moins un mécanicien pour le diagnostic.');
      return;
    }

    this.saving = true;
    this.doSaveFicheData(() => {
      if (this.editingFicheStatus === 'A_FAIRE') {
        this.advanceStatutTo('EN_DIAGNOSTIC' as StatutFiche, () => {
          this.saving = false;
          this.notify('Diagnostic commencé et sauvegardé.');
          this.load();
        });
      } else {
        const trueStep = this.statutToStep(this.editingFicheStatus!);
        if (trueStep <= 2) {
          this.service.updateStatut(this.editingId!, 'EN_ATTENTE_PROFORMA')
            .subscribe(() => {
              this.saving = false;
              this.notify('Diagnostic terminé et sauvegardé. Sélectionnez les pièces.');
              this.currentStep = 3;
              this.load();
            });
        } else {
          this.saving = false;
          this.notify('Diagnostic sauvegardé.');
          this.currentStep = 3;
          this.load();
        }
      }
    }, (err) => {
      this.saving = false;
      this.notifyError('Erreur lors de la sauvegarde: ' + (err.error?.message || ''));
    });
  }

  // ─── Pièces & Main d'œuvre (Nouvelle Étape 3) ──────────────────────
  savePiecesEtMo() {
    if (this.lignesPieces.length === 0 && this.lignesMO.length === 0) {
      this.notifyError('Veuillez ajouter au moins une pièce ou une main d\'œuvre.');
      return;
    }

    this.proformaSaving = true;

    this.doSaveFicheData(() => {
      this.proformaSaving = false;
      this.proformaService.getByOrdreReparationId(this.editingId!).subscribe({
        next: (p: any) => {
          this.proformaChargee = p;
          const num = p.numero || p.code || ('DK-' + p.id);
          this.notify(`Pièces et main d'œuvre enregistrées. Proforma ${num} généré.`);
          this.currentStep = 4;
          this.load();
        },
        error: () => {
          this.notify('Pièces et main d\'œuvre enregistrées dans la ordre de réparation.');
          this.currentStep = 4;
          this.load();
        }
      });
    }, (err) => {
      this.proformaSaving = false;
      this.notifyError('Erreur lors de la sauvegarde : ' + (err.error?.message || ''));
    });
  }

  // La proforma est validée par un autre acteur (client/secrétaire), le chef d'atelier attend le changement de statut.
  checkProformaValid() {
    if (!this.editingId) return;
    this.proformaSaving = true;
    this.service.getById(this.editingId).subscribe({
      next: (f: OrdreReparation) => {
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

  envoyerProforma() {
    const profId = this.proformaChargee?.id || this.selectedFicheProforma?.id;
    if (!profId) return;
    this.proformaSaving = true;
    this.proformaService.validerEnvoi(profId).subscribe({
      next: (p: any) => {
        this.proformaSaving = false;
        this.proformaChargee = p;
        this.notify('Le proforma a été envoyé au client avec succès.');
        this.load();
      },
      error: (err) => {
        this.proformaSaving = false;
        this.notifyError('Erreur lors de l\'envoi du proforma.');
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
      ordreReparationId: fiche.id,
      lignesPieces: lignes.map(l => ({
        pieceId: (l.isCustom ? null : l.piece?.id) as any,
        quantite: l.aSortirMagasin || 0,
        prix: (l.prixUnitaire || l.piece?.prix) as any,
        isCustom: l.isCustom,
        designationPds: l.designationPds
      })),
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
    if (this.selectedTechniciens.length === 0) {
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
      next: (f: OrdreReparation) => {
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
      next: (f: OrdreReparation) => {
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
      next: (f: OrdreReparation) => {
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
      next: (f) => {
        if (f && f.statut) {
          this.editingFicheStatus = f.statut;
        } else {
          this.editingFicheStatus = statut;
        }
        cb();
      },
      error: (err) => {
        console.error('PATCH STATUT ERROR:', err);
        cb();
      }
    });
  }

  // ─── Création de facture depuis la ordre de réparation ─────────────────
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
      ordreReparationId: Number(this.editingId),
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
          this.notify('Facture créée depuis la ordre de réparation.');
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
          const list = extractContent<any>(clients);
          this.allClients = list;
          this.creatingClient = false;
          this.showCreateClient = false;
          const newClient = list.find((c: any) => c.username === payload.username);
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

  addPiece() {
    this.lignesPieces.push({
      isCustom: false,
      quantite: 1,
      stockDisponible: 0,
      manquant: 0,
      aSortirMagasin: 0,
      pieceIdTemp: undefined
    });
  }

  togglePieceCustom(idx: number) {
    const l = this.lignesPieces[idx];
    l.isCustom = !l.isCustom;
    if (l.isCustom) {
      l.piece = undefined;
      l.pieceIdTemp = undefined;
      l.stockDisponible = 0;
      l.manquant = 0;
      l.aSortirMagasin = 0;
      l.prixUnitaire = 0;
    }
  }

  onSelectCataloguePiece(idx: number, pieceId: number) {
    const piece = this.piecesFiltrees.find(p => p.id === pieceId) || this.allPieces.find(p => p.id === pieceId);
    if (!piece) return;
    const l = this.lignesPieces[idx];

    // verifier si pas deja existante
    const existingIdx = this.lignesPieces.findIndex((ligne, i) => i !== idx && !ligne.isCustom && ligne.piece?.id === pieceId);
    if (existingIdx !== -1) {
      this.notifyError('Cette pièce est déjà dans la liste');
      l.pieceIdTemp = l.piece?.id;
      return;
    }

    l.piece = piece;
    const stockAtelier = piece.stockAtelier ?? 0;
    const stockMagasin = piece.stockMagasin ?? 0;
    l.stockDisponible = stockAtelier + stockMagasin;
    l.stockAtelier = stockAtelier;

    const manquantAtelier = Math.max(0, l.quantite - stockAtelier);
    l.aSortirMagasin = Math.min(manquantAtelier, stockMagasin);
    l.manquant = Math.max(0, manquantAtelier - stockMagasin);
  }

  updateQtePiece(idx: number, qte: number) {
    const l = this.lignesPieces[idx];
    l.quantite = Math.max(1, qte);

    if (!l.isCustom && l.piece) {
      const stockAtelier = l.stockAtelier ?? 0;
      const stockMagasin = l.piece.stockMagasin ?? 0;
      const manquantAtelier = Math.max(0, l.quantite - stockAtelier);
      l.aSortirMagasin = Math.min(manquantAtelier, stockMagasin);
      l.manquant = Math.max(0, manquantAtelier - stockMagasin);
    }
  }

  removePiece(idx: number) { this.lignesPieces.splice(idx, 1); }

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

  // ─── Pièces jointes de diagnostic (photos/PDF, cf. spec point 3) ──────
  piecesJointesDiagnostic: PieceJointeDiagnostic[] = [];
  piecesJointesFilterType: '' | TypePieceJointeDiagnostic = '';
  pieceJointeRemarque = '';
  pieceJointeUploading = false;
  pieceJointeError = '';

  get piecesJointesFiltrees(): PieceJointeDiagnostic[] {
    if (!this.piecesJointesFilterType) return this.piecesJointesDiagnostic;
    return this.piecesJointesDiagnostic.filter(p => p.type === this.piecesJointesFilterType);
  }

  onPiecesJointesFilterChange(type: string) {
    this.piecesJointesFilterType = (type as '' | TypePieceJointeDiagnostic);
    this.loadPiecesJointesDiagnostic();
  }

  loadPiecesJointesDiagnostic() {
    if (!this.editingId) return;
    const type = this.piecesJointesFilterType || undefined;
    this.service.getPiecesJointesDiagnostic(this.editingId, type).subscribe({
      next: (list) => { this.piecesJointesDiagnostic = list; },
      error: () => { this.piecesJointesDiagnostic = []; },
    });
  }

  onPieceJointeUploaded(result: CloudinaryUploadResult) {
    if (!this.editingId) return;
    const type: TypePieceJointeDiagnostic = (result.format === 'pdf' || result.resourceType === 'raw') ? 'PDF' : 'PHOTO';
    this.pieceJointeUploading = true;
    this.service.addPieceJointeDiagnostic(this.editingId, {
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
        this.pieceJointeError = err.error?.message || "Erreur lors de l'enregistrement de la pièce jointe.";
      },
    });
  }

  removePieceJointeDiagnostic(pieceJointeId: number) {
    if (!this.editingId) return;
    if (!confirm('Supprimer cette pièce jointe de diagnostic ?')) return;
    this.service.deletePieceJointeDiagnostic(this.editingId, pieceJointeId).subscribe({
      next: () => { this.loadPiecesJointesDiagnostic(); },
      error: () => { this.notifyError('Erreur lors de la suppression de la pièce jointe.'); },
    });
  }

  // ─── Techniciens ─────────────────────────────────────
  isTechnicienSelected(id: number): boolean { return this.selectedTechniciens.includes(id); }

  toggleTechnicienStepper(technicien: Technicien) {
    if (!this.editingId || this.technicienToggling !== null) return;
    this.technicienToggling = technicien.id;
    const assigned = this.isTechnicienSelected(technicien.id);

    let req$;
    if (this.currentStep === 7) {
      req$ = assigned
        ? this.service.removeTechnicienReparation(this.editingId, technicien.id)
        : this.service.assignTechnicienReparation(this.editingId, technicien.id);
    } else {
      req$ = assigned
        ? this.service.removeTechnicien(this.editingId, technicien.id)
        : this.service.assignTechnicien(this.editingId, technicien.id);
    }

    req$.subscribe({
      next: () => {
        if (assigned) this.selectedTechniciens = this.selectedTechniciens.filter(id => id !== technicien.id);
        else this.selectedTechniciens = [...this.selectedTechniciens, technicien.id];
        this.technicienToggling = null;
      },
      error: (err) => {
        console.error("Backend Error Trace:", err?.error?.trace || err);
        this.notifyError(err?.error?.message || 'Erreur lors de l\'assignation du technicien');
        this.technicienToggling = null;
      },
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
      observation: `Commande liée à la ordre de réparation #${this.step1Form.value.numero}`,
      lignes: this.rupturesOnly.map(l => ({
        pieceDetacheeId: l.piece?.id as number,
        quantite: l.manquant,
        prixUnitaire: l.piece?.prix ?? 0
      })),
    };
    this.bdcSaving = true;
    this.bdcService.create(payload).subscribe({
      next: () => {
        this.showBDCModal = false;
        this.notify('Bon de commande créé en attente. Allez dans « Bons de commande » pour assigner un fournisseur.');
        this.advanceStatutTo('EN_ATTENTE_COMMANDE', () => {
          this.editingFicheStatus = 'EN_ATTENTE_COMMANDE';
          this.currentStep = 5;
          this.bdcSaving = false;
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
  selectFiche(f: OrdreReparation) {
    if (this.selectedFiche && this.selectedFiche.id === f.id) {
      this.selectedFiche = null;
      return;
    }
    this.detailLoading = true;
    this.selectedFiche = null; // Hide current while loading
    this.service.getById(f.id).subscribe({
      next: (fullFiche: OrdreReparation) => {
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

  ficheInitials(f: OrdreReparation): string {
    return (f.vehicule?.immatriculation ?? 'FA').slice(0, 2).toUpperCase();
  }

  hasPiecesOrMo(f: OrdreReparation | any): boolean {
    if (!f) return false;
    // from backend light DTO
    if (f.hasPiecesOrMo === true) return true;

    // fallback if full detail is loaded
    return (f.lignesOrdreReparationPieces && f.lignesOrdreReparationPieces.length > 0) ||
      (f.lignesOrdreReparationMainDoeuvres && f.lignesOrdreReparationMainDoeuvres.length > 0) || false;
  }

  statutLabel(f: OrdreReparation): string {
    if (!f) return '';
    if (f.statut === 'EN_ATTENTE_PROFORMA' && this.hasPiecesOrMo(f)) return 'Proforma';
    return STATUT_STEPS.find(st => st.statut === f.statut)?.label ?? f.statut;
  }

  statutStepIndex(f: OrdreReparation): number {
    if (!f) return 0;
    if (f.statut === 'EN_ATTENTE_PROFORMA' && this.hasPiecesOrMo(f)) return 3; // Index 3 is Proforma
    return STATUT_STEPS.findIndex(st => st.statut === f.statut);
  }

  statutColor(f: OrdreReparation): string {
    if (!f) return '#6b7280';
    if (f.statut === 'EN_ATTENTE_PROFORMA' && this.hasPiecesOrMo(f)) return '#a855f7';
    const map: Record<string, string> = {
      A_FAIRE: '#6b7280', EN_DIAGNOSTIC: '#f59e0b', EN_ATTENTE_PROFORMA: '#8b5cf6',
      PROFORMA_VALIDE: '#a855f7', EN_ATTENTE_COMMANDE: '#ec4899', EN_ATTENTE_SORTIE: '#eab308',
      EN_COURS: '#3b82f6', EN_ATTENTE_PAIEMENT: '#ef4444', TERMINE: '#10b981', LIVRE: '#22c55e',
    };
    return map[f.statut] ?? '#6b7280';
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

  get isEtape3Valid(): boolean {
    const piecesRemplies = this.lignesPieces.every(l => {
      if (l.isCustom) return l.designationPds && l.designationPds.trim().length > 0;
      return l.piece != null;
    });
    const moRemplies = this.lignesMO.every(l => l.mo != null && l.quantite > 0);
    const hasItems = this.lignesPieces.length > 0 || this.lignesMO.length > 0;
    return hasItems && piecesRemplies && moRemplies;
  }

  // Raccourci : peut-on créer le bon de sortie ?
  get canCreateBDS(): boolean {
    return this.lignesPieces.length > 0 || this.lignesMO.length > 0;
  }

  // ─── Pagination ──────────────────────────────────────
  get paged(): OrdreReparation[] {
    return this.filtered;
  }

  // ─── Calculs ─────────────────────────────────────────
  get totalPieces(): number { return this.lignesPieces.reduce((s, l) => s + (l.isCustom ? (l.prixUnitaire ?? 0) : (l.piece?.prix ?? 0)) * l.quantite, 0); }
  get totalMO(): number { return this.lignesMO.reduce((s, l) => s + l.mo.prix * l.quantite, 0); }
  get grandTotal(): number { return this.totalPieces + this.totalMO; }

  formatPrice(n: number): string { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'; }
  formatDate(d: string | null): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }

  delete(id: number) {
    if (!confirm('Supprimer cette ordre de réparation ?')) return;
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

  loadRemarquesDiagnostic(ficheId: number) {
    this.service.getRemarquesDiagnostic(ficheId).subscribe({
      next: (list) => { this.remarquesDiagnostic = list; },
      error: () => { this.remarquesDiagnostic = []; },
    });
  }
}
