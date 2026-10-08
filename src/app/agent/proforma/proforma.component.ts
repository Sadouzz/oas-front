import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ProformaService } from './proforma.service';
import { BonDeCommandeService } from '../bons-commande/bon-de-commande.service';
import { ClientService } from '../clients/client.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { PieceDetacheeService } from '../pieces-detachees/piece-detachee.service';
import { MainDoeuvreService } from '../main-doeuvre/main-doeuvre.service';
import { CommonModule, NgClass } from '@angular/common';
import { Proforma, BonDeCommande, ClientModel, VehiculeModel, PieceDetache, MainDoeuvreModel, extractContent } from '../../shared/models/index';
import { LucidePencil, LucideTrash2, LucidePlus, LucideSearch, LucideX } from '@lucide/angular';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { ProformaPrintComponent, montantEnLettresFCFA } from '../../shared/document-print';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';

export interface LignePieceFormItem {
  id?: number;
  pieceId?: number | null;
  piece?: PieceDetache;
  isCustom: boolean;
  type?: 'PDP' | 'PDG' | 'PDS';
  designationPds?: string;
  quantite: number;
  prix: number;
  manquant?: number;
  stockDisponible?: number;
}

export interface LigneMOFormItem {
  id?: number;
  mainDoeuvreId: number;
  mo?: MainDoeuvreModel;
  descriptionMainDoeuvre?: string;
  nbreHeure: number;
  tarifHoraire: number;
}

@Component({
  selector: 'app-proforma',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgClass,
    LucidePencil,
    LucideTrash2,
    LucidePlus,
    LucideSearch,
    LucideX,
    ProformaPrintComponent,
    SearchableSelectComponent
  ],
  templateUrl: './proforma.component.html',
})
export class ProformaComponent extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(ProformaService);
  private bcService = inject(BonDeCommandeService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private mdService = inject(MainDoeuvreService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  proformas: Proforma[] = [];
  filtered: Proforma[] = [];
  clients: ClientModel[] = [];
  vehicules: VehiculeModel[] = [];
  clientVehicules: VehiculeModel[] = [];
  bonsCommande: BonDeCommande[] = [];
  pieces: PieceDetache[] = [];
  mainsDoeuvre: MainDoeuvreModel[] = [];

  bcLinked = false;
  bcOpen = false;
  bcFilter = '';

  loading = true;
  saving = false;
  showModal = false;
  isNew = true;
  editingId: number | null = null;
  selectedProforma: Proforma | null = null;
  selectedProformaForPrint: any = null;

  clientOpen = false;
  vehiculeOpen = false;
  clientFilter = '';
  vehiculeFilter = '';

  statutFilter = '';
  successMessage = '';
  errorMessage = '';
  warningMessage = '';

  // Formulaire d'en-tête / métadonnées
  form: FormGroup = this.fb.group({
    bonDeCommandeId: [null as number | null],
    clientId: [null, Validators.required],
    vehiculeId: [null],
    kilometrage: [0, [Validators.required, Validators.min(0)]],
    immatriculation: [''],
    numeroChassis: [''],
    marque: [''],
    modele: [''],
    annee: [null],
    numeroBonDeCommande: [''],
    remarque: [''],
    tvaRate: [18],
    montantTimbre: [0],
    montantAutre: [0],
  });

  // Lignes dynamiques (PDP, PDG, PDS & MO)
  lignesPieces: LignePieceFormItem[] = [];
  lignesMO: LigneMOFormItem[] = [];

  // Formulaire d'ajout PDP
  piecePdpAjouter: number | null = null;
  qteAjouterPdp = 1;
  prixAjouterPdp: number | null = null;

  // Formulaire d'ajout PDG
  piecePdgAjouter: number | null = null;
  qteAjouterPdg = 1;
  prixAjouterPdg: number | null = null;

  // Formulaire d'ajout PDS (Hors catalogue)
  pieceCustomDesignation = '';
  pieceCustomQuantite = 1;
  pieceCustomPrix: number | null = null;

  // Formulaire d'ajout Main d'œuvre
  moAjouter: number | null = null;
  qteAjouterMO = 1;
  prixAjouterMO: number | null = null;

  ngOnInit() {
    this.load();
    forkJoin({
      clients: this.clientService.getAll(),
      vehicules: this.vehiculeService.getAll(),
      pieces: this.pieceService.getAll(),
      mds: this.mdService.getAll(),
      bonsCommande: this.bcService.getAll(),
    }).subscribe({
      next: ({ clients, vehicules, pieces, mds, bonsCommande }: any) => {
        this.clients = extractContent(clients);
        this.vehicules = extractContent(vehicules);
        this.pieces = extractContent(pieces);
        this.mainsDoeuvre = extractContent(mds).filter((m: any) => !m.isArchived);
        this.bonsCommande = extractContent(bonsCommande);

        // Auto-open modal if openId or action is provided in query params
        this.route.queryParams.subscribe(params => {
          if (params['action'] === 'new') {
            this.openNew();
          }
          const openId = params['openId'];
          if (openId) {
            const id = Number(openId);
            const p = this.proformas.find(x => x.id === id);
            if (p) {
              this.openEdit(p);
            } else {
              this.service.getById(id).subscribe(prof => {
                if (prof) this.openEdit(prof);
              });
            }
          }
        });
      },
    });
  }

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    this.cdr.markForCheck();
    this.service.getAll(this.getPageParams()).subscribe({
      next: data => {
        const list = this.applyPageResponse<Proforma>(data);
        this.proformas = list.sort((a: any, b: any) => b.id - a.id);
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.proformas = [];
        this.filtered = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilter() {
    let list = this.proformas;
    if (this.statutFilter) {
      list = list.filter(p => p.statut === this.statutFilter);
    }
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        p.numero.toLowerCase().includes(kw) ||
        p.clientNom.toLowerCase().includes(kw) ||
        (p.immatriculation ?? '').toLowerCase().includes(kw)
      );
    }
    this.filtered = list;
  }

  onStatutFilterChange(e: Event) {
    this.statutFilter = (e.target as HTMLSelectElement).value;
    this.page = 1;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  // Listes filtrées pour l'ajout
  get piecesPdpFiltrees(): PieceDetache[] {
    return this.pieces.filter(p => p.type === 'PDP' && p.statut !== 'ARCHIVE');
  }

  get piecesPdgFiltrees(): PieceDetache[] {
    return this.pieces.filter(p => p.type === 'PDG' && p.statut !== 'ARCHIVE');
  }

  get moFiltrees(): MainDoeuvreModel[] {
    return this.mainsDoeuvre.filter(m => !m.isArchived);
  }

  // Sous-listes de pièces par catégorie
  get lignesPiecesPdp(): LignePieceFormItem[] {
    return this.lignesPieces.filter(l => !l.isCustom && (l.type === 'PDP' || l.piece?.type === 'PDP'));
  }

  get lignesPiecesPdg(): LignePieceFormItem[] {
    return this.lignesPieces.filter(l => !l.isCustom && (l.type === 'PDG' || l.piece?.type === 'PDG'));
  }

  get lignesPiecesPds(): LignePieceFormItem[] {
    return this.lignesPieces.filter(l => l.isCustom || l.type === 'PDS');
  }

  get lignesMOList(): LigneMOFormItem[] {
    return this.lignesMO;
  }

  // Formatters pour les searchable selects
  formatPiece = (p: any): string => {
    if (!p) return '';
    const ref = p.reference ? `${p.reference} — ` : '';
    const des = p.designation || '';
    const prix = p.prix != null ? ` (${this.fmt(p.prix)} FCFA)` : '';
    return `${ref}${des}${prix}`;
  };

  formatMO = (m: any): string => {
    if (!m) return '';
    const desc = m.description || m.categorie?.nom || '';
    const prix = m.prix != null ? ` (${this.fmt(m.prix)} FCFA)` : '';
    return `${desc}${prix}`;
  };

  // Sélections pour ajout
  onPiecePdpSelected(pieceId: any): void {
    if (!pieceId) {
      this.prixAjouterPdp = null;
      return;
    }
    const p = this.pieces.find(item => item.id === Number(pieceId));
    if (p) {
      this.prixAjouterPdp = p.prix ?? null;
    }
  }

  onPiecePdgSelected(pieceId: any): void {
    if (!pieceId) {
      this.prixAjouterPdg = null;
      return;
    }
    const p = this.pieces.find(item => item.id === Number(pieceId));
    if (p) {
      this.prixAjouterPdg = p.prix ?? null;
    }
  }

  onMoSelected(moId: any): void {
    if (!moId) {
      this.prixAjouterMO = null;
      return;
    }
    const m = this.mainsDoeuvre.find(item => item.id === Number(moId));
    if (m) {
      this.prixAjouterMO = m.prix ?? null;
      if (m.nbreHeure) this.qteAjouterMO = m.nbreHeure;
    }
  }

  // Ajout PDP
  addPiecePdp(): void {
    if (!this.piecePdpAjouter || this.qteAjouterPdp <= 0) return;
    const p = this.pieces.find(item => item.id === Number(this.piecePdpAjouter));
    if (!p) return;

    const unitPrice = this.prixAjouterPdp != null && this.prixAjouterPdp >= 0 ? this.prixAjouterPdp : (p.prix ?? 0);
    const existing = this.lignesPieces.find(l => !l.isCustom && l.pieceId === p.id);

    if (existing) {
      existing.quantite += this.qteAjouterPdp;
      if (unitPrice > 0) existing.prix = unitPrice;
      this.onPieceQuantiteChange(existing);
    } else {
      const item: LignePieceFormItem = {
        isCustom: false,
        pieceId: p.id,
        piece: p,
        type: 'PDP',
        quantite: this.qteAjouterPdp,
        prix: unitPrice,
        stockDisponible: (p.stockMagasin ?? 0) + (p.stockAtelier ?? 0),
        manquant: Math.max(0, this.qteAjouterPdp - (p.stockMagasin ?? 0)),
      };
      this.lignesPieces.push(item);
    }

    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.cdr.markForCheck();
  }

  // Ajout PDG
  addPiecePdg(): void {
    if (!this.piecePdgAjouter || this.qteAjouterPdg <= 0) return;
    const p = this.pieces.find(item => item.id === Number(this.piecePdgAjouter));
    if (!p) return;

    const unitPrice = this.prixAjouterPdg != null && this.prixAjouterPdg >= 0 ? this.prixAjouterPdg : (p.prix ?? 0);
    const existing = this.lignesPieces.find(l => !l.isCustom && l.pieceId === p.id);

    if (existing) {
      existing.quantite += this.qteAjouterPdg;
      if (unitPrice > 0) existing.prix = unitPrice;
      this.onPieceQuantiteChange(existing);
    } else {
      const item: LignePieceFormItem = {
        isCustom: false,
        pieceId: p.id,
        piece: p,
        type: 'PDG',
        quantite: this.qteAjouterPdg,
        prix: unitPrice,
        stockDisponible: (p.stockMagasin ?? 0) + (p.stockAtelier ?? 0),
        manquant: Math.max(0, this.qteAjouterPdg - (p.stockMagasin ?? 0)),
      };
      this.lignesPieces.push(item);
    }

    this.piecePdgAjouter = null;
    this.qteAjouterPdg = 1;
    this.prixAjouterPdg = null;
    this.cdr.markForCheck();
  }

  // Ajout PDS (Hors catalogue)
  addPieceCustom(): void {
    const des = this.pieceCustomDesignation.trim();
    if (!des || this.pieceCustomQuantite <= 0) return;

    const unitPrice = this.pieceCustomPrix != null && this.pieceCustomPrix >= 0 ? this.pieceCustomPrix : 0;
    const existing = this.lignesPieces.find(l => l.isCustom && (l.designationPds || '').toLowerCase() === des.toLowerCase());

    if (existing) {
      existing.quantite += this.pieceCustomQuantite;
      if (unitPrice > 0) existing.prix = unitPrice;
    } else {
      const item: LignePieceFormItem = {
        isCustom: true,
        type: 'PDS',
        designationPds: des,
        quantite: this.pieceCustomQuantite,
        prix: unitPrice,
        manquant: 0,
        stockDisponible: 0,
      };
      this.lignesPieces.push(item);
    }

    this.pieceCustomDesignation = '';
    this.pieceCustomQuantite = 1;
    this.pieceCustomPrix = null;
    this.cdr.markForCheck();
  }

  // Ajout MO
  addMO(): void {
    if (!this.moAjouter || this.qteAjouterMO <= 0) return;
    const m = this.mainsDoeuvre.find(item => item.id === Number(this.moAjouter));
    if (!m) return;

    const unitPrice = this.prixAjouterMO != null && this.prixAjouterMO >= 0 ? this.prixAjouterMO : (m.prix ?? 0);
    const existing = this.lignesMO.find(l => l.mainDoeuvreId === m.id);

    if (existing) {
      existing.nbreHeure += this.qteAjouterMO;
      if (unitPrice > 0) existing.tarifHoraire = unitPrice;
    } else {
      const item: LigneMOFormItem = {
        mainDoeuvreId: m.id,
        mo: m,
        descriptionMainDoeuvre: m.description || m.categorie?.nom,
        nbreHeure: this.qteAjouterMO,
        tarifHoraire: unitPrice,
      };
      this.lignesMO.push(item);
    }

    this.moAjouter = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
    this.cdr.markForCheck();
  }

  // Modification & Suppression Pièces
  incrementPiece(item: LignePieceFormItem): void {
    item.quantite = (item.quantite || 0) + 1;
    this.onPieceQuantiteChange(item);
  }

  decrementPiece(item: LignePieceFormItem): void {
    if (item.quantite > 1) {
      item.quantite--;
      this.onPieceQuantiteChange(item);
    }
  }

  onPieceQuantiteChange(item: LignePieceFormItem): void {
    if (!item.isCustom && item.piece) {
      item.manquant = Math.max(0, (item.quantite || 0) - (item.piece?.stockMagasin ?? 0));
    }
    this.cdr.markForCheck();
  }

  removePieceItem(item: LignePieceFormItem): void {
    const idx = this.lignesPieces.indexOf(item);
    if (idx !== -1) {
      this.lignesPieces.splice(idx, 1);
      this.cdr.markForCheck();
    }
  }

  // Modification & Suppression MO
  incrementMO(item: LigneMOFormItem): void {
    item.nbreHeure = (item.nbreHeure || 0) + 1;
    this.cdr.markForCheck();
  }

  decrementMO(item: LigneMOFormItem): void {
    if (item.nbreHeure > 1) {
      item.nbreHeure--;
      this.cdr.markForCheck();
    }
  }

  removeMOItem(item: LigneMOFormItem): void {
    const idx = this.lignesMO.indexOf(item);
    if (idx !== -1) {
      this.lignesMO.splice(idx, 1);
      this.cdr.markForCheck();
    }
  }

  // Bon de Commande
  get bcLabel(): string {
    const id = this.form.get('bonDeCommandeId')?.value;
    if (!id) return '';
    const bc = this.bonsCommande.find(b => b.id === Number(id));
    return bc ? `${bc.numero} — ${bc.immatriculationVehicule ?? ''}` : '';
  }

  get filteredBonsCommande(): BonDeCommande[] {
    if (!this.bcFilter) return this.bonsCommande;
    const kw = this.bcFilter.toLowerCase();
    return this.bonsCommande.filter(bc =>
      bc.numero.toLowerCase().includes(kw) ||
      (bc.immatriculationVehicule ?? '').toLowerCase().includes(kw)
    );
  }

  selectBC(bc: BonDeCommande) {
    this.form.patchValue({ bonDeCommandeId: bc.id, numeroBonDeCommande: bc.numero });
    const vehicule = this.vehicules.find(v => v.id === bc.vehiculeId);
    if (vehicule) {
      this.clientVehicules = [vehicule];
      this.form.patchValue({
        clientId: vehicule.client?.id ?? null,
        vehiculeId: vehicule.id,
        immatriculation: vehicule.immatriculation,
        numeroChassis: vehicule.numeroChassis,
        marque: vehicule.marque,
        modele: vehicule.modele,
        annee: vehicule.annee,
        kilometrage: vehicule.kilometrage ?? 0,
      });
    }
    this.bcLinked = true;
    this.bcFilter = '';
    this.bcOpen = false;
  }

  clearBC() {
    this.form.patchValue({
      bonDeCommandeId: null,
      numeroBonDeCommande: '',
      clientId: null,
      vehiculeId: null,
      immatriculation: '',
      numeroChassis: '',
      marque: '',
      modele: '',
      annee: null,
    });
    this.bcLinked = false;
    this.clientVehicules = [];
  }

  get clientLabel(): string {
    const id = this.form.get('clientId')?.value;
    if (id) {
      const c = this.clients.find(x => x.id === Number(id));
      if (c) return `${c.firstName} ${c.lastName}`;
    }
    return this.selectedProforma?.clientNom || '';
  }

  get vehiculeLabel(): string {
    const id = this.form.get('vehiculeId')?.value;
    if (id) {
      const v = this.vehicules.find(x => x.id === Number(id));
      if (v) return `${v.immatriculation} — ${v.marque}`;
    }
    if (this.selectedProforma?.immatriculation) {
      return `${this.selectedProforma.immatriculation}${this.selectedProforma.marque ? ' — ' + this.selectedProforma.marque : ''}`;
    }
    return '';
  }

  get filteredClients(): ClientModel[] {
    if (!this.clientFilter) return this.clients;
    const kw = this.clientFilter.toLowerCase();
    return this.clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(kw) ||
      (c.phone ?? '').toLowerCase().includes(kw)
    );
  }

  get filteredVehicules(): VehiculeModel[] {
    if (!this.vehiculeFilter) return this.clientVehicules;
    const kw = this.vehiculeFilter.toLowerCase();
    return this.clientVehicules.filter(v =>
      v.immatriculation.toLowerCase().includes(kw) ||
      `${v.marque} ${v.modele}`.toLowerCase().includes(kw)
    );
  }

  selectClient(c: ClientModel) {
    this.clientVehicules = this.vehicules.filter(v => v.client?.id === c.id);
    this.form.patchValue({ clientId: c.id, vehiculeId: null, immatriculation: '', numeroChassis: '', marque: '', modele: '', annee: null });
    this.clientFilter = '';
    this.clientOpen = false;
  }

  selectVehicule(v: VehiculeModel | null) {
    if (!v) {
      this.form.patchValue({ vehiculeId: null });
    } else {
      this.form.patchValue({
        vehiculeId: v.id,
        immatriculation: v.immatriculation,
        numeroChassis: v.numeroChassis,
        marque: v.marque,
        modele: v.modele,
        annee: v.annee,
        kilometrage: v.kilometrage ?? 0,
      });
    }
    this.vehiculeFilter = '';
    this.vehiculeOpen = false;
  }

  openNew() {
    this.isNew = true;
    this.editingId = null;
    this.clientVehicules = [];
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.bcLinked = false;
    this.bcOpen = false;
    this.bcFilter = '';

    this.form.reset({
      kilometrage: 0,
      montantTimbre: 0,
      montantAutre: 0,
      tvaRate: 18,
    });

    this.lignesPieces = [];
    this.lignesMO = [];
    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.piecePdgAjouter = null;
    this.qteAjouterPdg = 1;
    this.prixAjouterPdg = null;
    this.pieceCustomDesignation = '';
    this.pieceCustomQuantite = 1;
    this.pieceCustomPrix = null;
    this.moAjouter = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;

    this.showModal = true;
    this.cdr.markForCheck();
  }

  openEdit(p: Proforma) {
    this.isNew = false;
    this.editingId = p.id;
    this.selectedProforma = p;
    this.populateFormFromProforma(p);
    this.showModal = true;
    this.cdr.markForCheck();

    // Récupérer la version détaillée complète (/details) du backend
    if (p.id) {
      this.service.getDetails(p.id).subscribe({
        next: (fullProforma) => {
          if (fullProforma && this.editingId === fullProforma.id) {
            this.selectedProforma = fullProforma;
            this.populateFormFromProforma(fullProforma);
            this.cdr.markForCheck();
          }
        },
        error: () => {
          // Fallback sur getById standard si /details n'est pas dispo
          this.service.getById(p.id).subscribe({
            next: (fullProforma) => {
              if (fullProforma && this.editingId === fullProforma.id) {
                this.selectedProforma = fullProforma;
                this.populateFormFromProforma(fullProforma);
                this.cdr.markForCheck();
              }
            },
            error: (err) => console.warn('Erreur lors du chargement des détails du proforma:', err)
          });
        }
      });
    }
  }

  private populateFormFromProforma(p: any): void {
    const clientId = p.clientId || p.client?.id;
    this.clientVehicules = clientId ? this.vehicules.filter(v => v.client?.id === clientId) : [];
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.bcOpen = false;
    this.bcFilter = '';

    const bcNum = p.numeroBonDeCommande || p.bonDeCommande?.numero || '';
    const linkedBC = bcNum ? this.bonsCommande.find(b => b.numero === bcNum) ?? null : null;
    this.bcLinked = !!linkedBC;

    this.form.patchValue({
      bonDeCommandeId: linkedBC?.id ?? p.bonDeCommandeId ?? null,
      clientId: clientId ?? null,
      vehiculeId: p.vehiculeId ?? p.vehicule?.id ?? null,
      kilometrage: p.kilometrage ?? p.vehicule?.kilometrage ?? 0,
      immatriculation: p.immatriculation ?? p.vehicule?.immatriculation ?? '',
      numeroChassis: p.numeroChassis ?? p.vehicule?.numeroChassis ?? '',
      marque: p.marque ?? p.vehicule?.marque ?? '',
      modele: p.modele ?? p.vehicule?.modele ?? '',
      annee: p.annee ?? p.vehicule?.annee ?? null,
      numeroBonDeCommande: bcNum,
      remarque: p.remarque ?? '',
      tvaRate: p.tvaRate ?? p.tva ?? 18,
      montantTimbre: p.montantTimbre ?? 0,
      montantAutre: p.montantAutre ?? 0,
    });

    // 1. Charger les lignes de pièces existantes
    const rawPieces: any[] = p.lignesPieces || p.pieces || [];
    this.lignesPieces = [];
    if (rawPieces.length > 0) {
      for (const l of rawPieces) {
        const pieceId = l.pieceId ?? l.piece?.id ?? null;
        const isCustom = !!(l.isCustom || l.custom || !pieceId || l.designationPds);
        const catPiece = !isCustom && pieceId ? this.pieces.find(x => x.id === Number(pieceId)) : (l.piece ?? null);
        
        let pieceType: 'PDP' | 'PDG' | 'PDS' = 'PDP';
        if (isCustom || l.type === 'PDS') {
          pieceType = 'PDS';
        } else if (l.type === 'PDG' || catPiece?.type === 'PDG') {
          pieceType = 'PDG';
        } else {
          pieceType = 'PDP';
        }

        const qte = Number(l.quantite ?? l.qte ?? 1) || 1;
        let unitPrice = 0;
        if (l.prix != null && Number(l.prix) >= 0) {
          unitPrice = Number(l.prix);
        } else if (l.prixUnitaire != null && Number(l.prixUnitaire) >= 0) {
          unitPrice = Number(l.prixUnitaire);
        } else if (l.montantTotal != null && qte > 0) {
          unitPrice = Number(l.montantTotal) / qte;
        } else if (catPiece?.prix != null) {
          unitPrice = Number(catPiece.prix);
        }

        const des = l.designationPds || l.designationPiece || l.designation || catPiece?.designation || (isCustom ? 'Pièce à saisir' : 'Pièce détachée');
        const ref = l.referencePiece || l.reference || catPiece?.reference || '';

        this.lignesPieces.push({
          id: l.id,
          pieceId: isCustom ? null : (pieceId ? Number(pieceId) : null),
          piece: catPiece ? { ...catPiece, reference: ref || catPiece.reference, designation: des || catPiece.designation } : null,
          isCustom,
          type: pieceType,
          designationPds: des,
          quantite: qte,
          prix: unitPrice,
          stockDisponible: catPiece ? ((catPiece.stockMagasin ?? 0) + (catPiece.stockAtelier ?? 0)) : 0,
          manquant: catPiece ? Math.max(0, qte - (catPiece.stockMagasin ?? 0)) : 0,
        });
      }
    }

    // 2. Charger les prestations de main-d'œuvre existantes
    const rawMO: any[] = p.lignesMainDoeuvres || p.lignesMainDoeuvre || p.mainsDoeuvre || [];
    this.lignesMO = [];
    if (rawMO.length > 0) {
      for (const l of rawMO) {
        const moId = l.mainDoeuvreId ?? l.mainDoeuvre?.id ?? null;
        const catMO = moId ? this.mainsDoeuvre.find(x => x.id === Number(moId)) : (l.mainDoeuvre ?? null);
        const heures = Number(l.nbreHeure ?? l.heures ?? l.quantite ?? 1) || 1;
        
        let tarif = 0;
        if (l.tarifHoraire != null && Number(l.tarifHoraire) >= 0) {
          tarif = Number(l.tarifHoraire);
        } else if (l.prix != null && Number(l.prix) >= 0) {
          tarif = Number(l.prix);
        } else if (l.prixUnitaire != null && Number(l.prixUnitaire) >= 0) {
          tarif = Number(l.prixUnitaire);
        } else if (l.montantTotal != null && heures > 0) {
          tarif = Number(l.montantTotal) / heures;
        } else if (catMO?.prix != null) {
          tarif = Number(catMO.prix);
        }

        const desc = l.descriptionMainDoeuvre || l.description || l.nom || catMO?.description || catMO?.categorie?.nom || 'Prestation main-d’œuvre';

        this.lignesMO.push({
          id: l.id,
          mainDoeuvreId: moId ? Number(moId) : 0,
          mo: catMO,
          descriptionMainDoeuvre: desc,
          nbreHeure: heures,
          tarifHoraire: tarif,
        });
      }
    }

    // Réinitialisation des inputs d'ajout
    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.piecePdgAjouter = null;
    this.qteAjouterPdg = 1;
    this.prixAjouterPdg = null;
    this.pieceCustomDesignation = '';
    this.pieceCustomQuantite = 1;
    this.pieceCustomPrix = null;
    this.moAjouter = null;
    this.qteAjouterMO = 1;
    this.prixAjouterMO = null;
  }

  openDetail(p: Proforma) {
    this.selectedProforma = p;
    if (p.id) {
      this.service.getDetails(p.id).subscribe({
        next: (fullProforma) => {
          if (fullProforma && this.selectedProforma?.id === fullProforma.id) {
            this.selectedProforma = fullProforma;
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.service.getById(p.id).subscribe(res => {
            if (res && this.selectedProforma?.id === res.id) {
              this.selectedProforma = res;
              this.cdr.markForCheck();
            }
          });
        }
      });
    }
  }
  closeDetail() { this.selectedProforma = null; }

  get hasAtLeastOneItem(): boolean {
    return this.lignesPieces.length > 0 || this.lignesMO.length > 0;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.hasAtLeastOneItem) {
      this.notifyError("Veuillez ajouter au moins une pièce détachée ou une prestation de main-d'œuvre.");
      return;
    }

    this.saving = true;
    const raw = this.form.value;
    const payload = {
      clientId: Number(raw.clientId),
      vehiculeId: raw.vehiculeId ? Number(raw.vehiculeId) : null,
      kilometrage: Number(raw.kilometrage),
      immatriculation: raw.immatriculation || undefined,
      numeroChassis: raw.numeroChassis || undefined,
      marque: raw.marque || undefined,
      modele: raw.modele || undefined,
      annee: raw.annee ? Number(raw.annee) : null,
      numeroBonDeCommande: raw.numeroBonDeCommande || undefined,
      remarque: raw.remarque || undefined,
      tvaRate: raw.tvaRate ? Number(raw.tvaRate) : 18,
      montantTimbre: Number(raw.montantTimbre) || 0,
      montantAutre: Number(raw.montantAutre) || 0,
      lignesPieces: this.lignesPieces.map(l => ({
        pieceId: l.isCustom ? null : l.pieceId,
        isCustom: l.isCustom,
        custom: l.isCustom,
        designationPds: l.isCustom ? l.designationPds : undefined,
        quantite: Number(l.quantite),
        prix: Number(l.prix),
      })),
      lignesMainDoeuvres: this.lignesMO.map(l => ({
        mainDoeuvreId: Number(l.mainDoeuvreId),
        nbreHeure: Number(l.nbreHeure),
        tarifHoraire: Number(l.tarifHoraire),
      })),
    };

    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);

    req$.subscribe({
      next: (savedProforma) => {
        this.showModal = false;
        this.load();
        if (this.selectedProforma && this.editingId === this.selectedProforma.id) {
          if (savedProforma && savedProforma.id) {
            this.selectedProforma = savedProforma;
          } else {
            this.service.getById(this.editingId!).subscribe(updated => {
              this.selectedProforma = updated;
              this.cdr.markForCheck();
            });
          }
        }
        const warnings: string[] = savedProforma?.avertissementsFinanciers ?? [];
        if (warnings.length) {
          this.saving = false;
          this.warningMessage = `${this.isNew ? 'Proforma créé' : 'Proforma mis à jour'} avec avertissement : ${warnings.join(' ')}`;
          setTimeout(() => this.warningMessage = '', 9000);
        } else this.notify(this.isNew ? 'Proforma créé avec succès.' : 'Proforma mis à jour avec succès.');
      },
      error: (err) => {
        this.saving = false;
        this.notifyError(err.error?.message || 'Erreur lors de la sauvegarde du proforma.');
      },
    });
  }

  convertToFacture(id: number) {
    if (!confirm('Convertir ce proforma en facture TTC ?')) return;
    this.service.convertToFacture(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Proforma converti en facture.'); },
      error: () => this.notifyError('Erreur lors de la conversion.'),
    });
  }

  validerEnvoi(id: number) {
    if (!confirm('Valider les prix et rendre ce proforma visible au client ? Vérifiez les lignes pièces/MO avant de continuer.')) return;
    this.service.validerEnvoi(id).subscribe({
      next: (updated) => {
        this.load();
        if (this.selectedProforma && this.selectedProforma.id === id) {
          this.selectedProforma.visibleClient = updated.visibleClient ?? true;
        }
        this.notify('Proforma validé et envoyé au client.');
      },
      error: (err) => this.notifyError(err.error?.message || "Erreur lors de l'envoi du proforma au client."),
    });
  }

  validerProforma(id: number) {
    if (!confirm('Valider ce proforma ? L\'accord client a-t-il été obtenu ?')) return;
    this.service.valider(id).subscribe({
      next: () => { 
        this.load(); 
        if (this.selectedProforma && this.selectedProforma.id === id) {
          this.selectedProforma.statut = 'ACCEPTE';
        }
        this.notify('Proforma validé.'); 
      },
      error: (err) => this.notifyError(err.error?.message || 'Erreur lors de la validation du proforma.'),
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce proforma ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Proforma supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  downloadPdf(id: number) {
    this.service.downloadPdf(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proforma-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  ouvrirPdf(id: number) {
    this.service.downloadPdf(id).subscribe({
      next: (blob) => {
        const file = new Blob([blob], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
      },
      error: () => {
        window.open(`/document-viewer/proforma/${id}`, '_blank');
      }
    });
  }

  imprimerProforma(p?: any) {
    const target = p || this.selectedProforma;
    if (!target) return;
    this.selectedProformaForPrint = {
      ...target,
      numero: target.numero || ('DK/' + target.id),
      date: target.dateCreation || target.createdAt || new Date().toISOString(),
      agentNom: target.agentNom || 'EL HAJ',
      client: {
        id: target.clientId || (target.client ? target.client.id : undefined),
        nom: target.clientNom || (target.client ? `${target.client.firstName || ''} ${target.client.lastName || ''}`.trim() : '-'),
        telephone: target.clientTelephone || target.client?.phone || '-',
        email: target.clientEmail || target.client?.email || '-',
        adresse: target.clientAdresse || target.client?.address || 'Dakar'
      },
      vehicule: {
        annee: target.annee || target.vehicule?.annee || '-',
        marque: target.marque || target.vehicule?.marque || '-',
        modele: target.modele || target.vehicule?.modele || '-',
        immatriculation: target.immatriculation || target.vehicule?.immatriculation || '-',
        kilometrage: target.kilometrage || target.vehicule?.kilometrage || '-',
        chassis: target.numeroChassis || target.vehicule?.numeroChassis || target.vehicule?.chassis || '-'
      },
      lignes: [
        ...(target.lignesPieces || []).map((lp: any) => ({
          reference: lp.referencePiece || lp.piece?.reference || lp.reference || (lp.isCustom ? 'PDS' : '-'),
          designation: lp.designationPiece || lp.piece?.designation || lp.designationPds || lp.designation || '-',
          quantite: lp.quantite,
          remise: lp.remise || 0,
          prixUnitaire: lp.prixUnitaire || lp.prix || (lp.quantite ? (lp.montantTotal / lp.quantite) : 0),
          totalLigne: lp.montantTotal || ((lp.quantite || 0) * (lp.prix || lp.prixUnitaire || 0))
        })),
        ...(target.lignesMainDoeuvres || []).map((lmo: any) => ({
          reference: 'MO',
          designation: lmo.descriptionMainDoeuvre || lmo.mainDoeuvre?.description || lmo.mainDoeuvre?.categorie?.nom || 'Main-d\'œuvre',
          quantite: lmo.nbreHeure || lmo.quantite || 1,
          remise: 0,
          prixUnitaire: lmo.tarifHoraire || lmo.prix || 0,
          totalLigne: lmo.montantTotal || ((lmo.nbreHeure || 1) * (lmo.tarifHoraire || lmo.prix || 0))
        }))
      ],
      remarques: target.remarque || '',
      totalHT: target.montantHT || target.totalHt || 0,
      tva: target.montantTVA || target.montantTva || 0,
      timbre: target.montantTimbre || target.timbre || 0,
      totalTTC: target.montantTTC || target.totalTtc || target.montantTotal || 0,
      montantEnLettres: montantEnLettresFCFA(target.montantTTC || target.totalTtc || target.montantTotal || 0)
    };
    this.cdr.detectChanges();
    setTimeout(() => {
      window.print();
    }, 50);
  }

  // Calculs dynamiques
  get totalPieces(): number {
    return this.lignesPieces.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix) || 0), 0);
  }

  get totalMO(): number {
    return this.lignesMO.reduce((s, l) => s + (Number(l.nbreHeure) || 0) * (Number(l.tarifHoraire) || 0), 0);
  }

  get totalHT(): number {
    return this.totalPieces + this.totalMO;
  }

  get tvaRate(): number {
    return Number(this.form.get('tvaRate')?.value) || 18;
  }

  get montantTVA(): number {
    return Math.round(this.totalHT * (this.tvaRate / 100));
  }

  get totalTTC(): number {
    const timbre = Number(this.form.get('montantTimbre')?.value) || 0;
    const autre = Number(this.form.get('montantAutre')?.value) || 0;
    return this.totalHT + this.montantTVA + timbre + autre;
  }

  get montantBonCommandeForm(): number {
    const id = this.form.get('bonDeCommandeId')?.value;
    if (!id) return 0;
    return this.bonsCommande.find(b => b.id === Number(id))?.montantTTC ?? 0;
  }

  totalAvecBC(p: Proforma): number {
    const bc = this.bonsCommande.find(b => b.numero === p.numeroBonDeCommande);
    return (bc?.montantTTC ?? 0) + (p.montantTotal || p.montantTTC || 0);
  }

  get montantBCDetail(): number {
    if (!this.selectedProforma?.numeroBonDeCommande) return 0;
    return this.bonsCommande.find(b => b.numero === this.selectedProforma!.numeroBonDeCommande)?.montantTTC ?? 0;
  }

  formatDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : '-'; }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): Proforma[] {
    return this.filtered;
  }

  private notify(msg: string) {
    this.saving = false; this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.saving = false; this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
