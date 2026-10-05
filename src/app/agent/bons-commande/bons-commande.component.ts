import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, Observable, of, Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, map } from 'rxjs';
import { BonDeCommande, ReceptionBonDeCommandeRequest, StatutBonCommande } from './models/bon-de-commande.model';
import { BonDeCommandeService } from './bon-de-commande.service';
import { FournisseurService } from '../fournisseurs/fournisseur.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { PieceDetacheeService } from '../pieces-detachees/piece-detachee.service';
import { ClientService } from '../clients/client.service';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FournisseurModel, VehiculeModel, PieceDetache, UserModel, ClientModel, extractContent, extractPage } from '../../shared/models/index';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideArrowRight } from '@lucide/angular';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-bons-commande',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, NgClass, PaginationComponent, SearchableSelectComponent],
  templateUrl: './bons-commande.component.html',
})
export class BonsCommandeComponent extends BasePaginatedComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(BonDeCommandeService);
  private fournisseurService = inject(FournisseurService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private clientService = inject(ClientService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  bons: BonDeCommande[] = [];
  filtered: BonDeCommande[] = [];
  fournisseurs: FournisseurModel[] = [];
  vehicules: VehiculeModel[] = [];
  pieces: PieceDetache[] = [];
  clients: (UserModel | ClientModel)[] = [];
  clientsLoading = false;
  vehiculesLoading = false;
  piecesLoading = false;
  private readonly clientSearch$ = new Subject<string>();
  private readonly pieceSearch$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  selectedClientId: number | null = null;
  clientOpen = false;
  vehiculeOpen = false;
  fournisseurOpen = false;
  clientFilter = '';
  vehiculeFilter = '';
  fournisseurFilter = '';

  loading = true;
  saving = false;
  showModal = false;
  loadingEdit = false;
  isNew = true;
  isReplenishment = false;
  editingId: number | null = null;
  selectedBon: BonDeCommande | null = null;
  actioning = false;

  // Bon de Réception popup
  showReceptionModal = false;
  receptionLignes: { ligneId: number; designationPiece: string; reference: string; quantiteCommandee: number; quantiteRecue: number; }[] = [];
  receptionSaving = false;

  // Assigner fournisseur popup
  showAssignFournisseur = false;
  assignFournisseurId: number | null = null;
  assigningFournisseur = false;

  successMessage = '';
  errorMessage = '';

  form: FormGroup = this.fb.group({
    fournisseurId: [null, Validators.required],
    clientId: [null],
    vehiculeId: [null],
    tvaApplicable: [false],
    observation: [''],
    lignes: this.fb.array([]),
  });

  get lignesArray(): FormArray { return this.form.get('lignes') as FormArray; }

  piecePdpAjouter: number | null = null;
  qteAjouterPdp = 1;
  prixAjouterPdp: number | null = null;
  private lignesNonPdpExistantes: any[] = [];

  get fournisseurLabel(): string {
    const id = this.form.get('fournisseurId')?.value;
    if (!id) return '';
    const f = this.fournisseurs.find(x => x.id === Number(id));
    return f ? (f.nomEntreprise || f.nom) : '';
  }

  get filteredFournisseurs(): FournisseurModel[] {
    if (!this.fournisseurFilter) return this.fournisseurs;
    const kw = this.fournisseurFilter.toLowerCase();
    return this.fournisseurs.filter(f =>
      (f.nomEntreprise ?? '').toLowerCase().includes(kw) ||
      (f.nom ?? '').toLowerCase().includes(kw)
    );
  }

  selectFournisseur(f: FournisseurModel) {
    this.form.patchValue({ fournisseurId: f.id });
    this.fournisseurFilter = '';
    this.fournisseurOpen = false;
  }

  get clientLabel(): string {
    const id = this.form.get('clientId')?.value;
    if (!id) return '';
    const c = this.clients.find(x => x.id === Number(id));
    return c ? `${c.firstName} ${c.lastName}` : '';
  }

  get vehiculeLabel(): string {
    const id = this.form.get('vehiculeId')?.value;
    if (!id) return '';
    const v = this.vehicules.find(x => x.id === Number(id));
    return v ? `${v.immatriculation} — ${v.marque}` : '';
  }

  get filteredClients(): (UserModel | ClientModel)[] {
    return this.clients;
  }

  get filteredVehicules(): VehiculeModel[] {
    if (!this.selectedClientId) return [];
    const base = this.vehicules;
    if (!this.vehiculeFilter) return base;
    const kw = this.vehiculeFilter.toLowerCase();
    return base.filter(v =>
      v.immatriculation.toLowerCase().includes(kw) ||
      `${v.marque} ${v.modele}`.toLowerCase().includes(kw)
    );
  }

  selectClient(c: UserModel | ClientModel | null) {
    this.selectedClientId = c?.id ?? null;
    this.form.patchValue({ clientId: c?.id ?? null, vehiculeId: null });
    this.vehicules = [];
    this.clientFilter = '';
    this.clientOpen = false;
    this.vehiculeFilter = '';
    this.vehiculeOpen = false;
    if (!c) return;

    this.loadVehiculesClient(c.id);
  }

  private loadVehiculesClient(clientId: number) {
    this.vehiculesLoading = true;
    this.vehiculeService.getByClient(clientId).subscribe({
      next: vehicules => {
        if (this.selectedClientId !== clientId) return;
        this.vehicules = vehicules;
        this.vehiculesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        if (this.selectedClientId !== clientId) return;
        this.vehiculesLoading = false;
        this.notifyError('Impossible de charger les véhicules de ce client.');
        this.cdr.markForCheck();
      },
    });
  }

  onClientSearch(value: string) {
    this.clientFilter = value;
    this.clientSearch$.next(value.trim());
  }

  selectVehicule(v: VehiculeModel | null) {
    this.form.patchValue({ vehiculeId: v?.id ?? null });
    this.vehiculeFilter = '';
    this.vehiculeOpen = false;
  }

  filterStatut = '';
  dateDebut = '';
  dateFin = '';
  filterFournisseur = '';
  showDateFilter = false;

  get piecesPdp(): PieceDetache[] { return this.pieces.filter(p => p.type === 'PDP' && p.statut === 'ACTIF'); }

  getLignesPdp(): { index: number; group: FormGroup }[] {
    return this.lignesArray.controls.flatMap((control, index) => {
      const group = control as FormGroup;
      return group.get('pieceType')?.value === 'PDP' ? [{ index, group }] : [];
    });
  }

  formatPiece(piece: PieceDetache): string {
    const depotNom = piece.depot?.nom ?? piece.categorie?.depot?.nom;
    return `${piece.reference} — ${piece.designation}${depotNom ? ` (${depotNom})` : ''}`;
  }

  ngOnInit() {
    this.clientSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(keyword => {
        this.clientsLoading = true;
        return this.clientService.getAll({ page: 0, size: 10, ...(keyword ? { keyword } : {}) });
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: response => {
        this.clients = extractContent<UserModel>(response).filter(client => client.enabled);
        this.clientsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.clientsLoading = false;
        this.notifyError('Impossible de charger les clients.');
        this.cdr.markForCheck();
      },
    });
    this.loadClients('');
    this.pieceSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(keyword => {
        this.piecesLoading = true;
        return this.searchPdp(keyword);
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: pieces => {
        const piecesById = new Map<number, PieceDetache>();
        [...this.pieces, ...pieces].forEach(piece => piecesById.set(piece.id, piece));
        this.pieces = [...piecesById.values()];
        this.piecesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.piecesLoading = false;
        this.notifyError('Impossible de charger les pièces de rechange.');
        this.cdr.markForCheck();
      },
    });
    this.pieceSearch$.next('');
    this.load();
    forkJoin({
      fournisseurs: this.fournisseurService.getAll(),
    }).subscribe({
      next: ({ fournisseurs }) => {
        this.fournisseurs = extractContent(fournisseurs).filter((f: any) => !f.archived);

        // Pre-fill BDC if query parameter pieceId is present
        this.route.queryParams.subscribe(params => {
          const pieceId = params['pieceId'];
          if (pieceId) {
            this.openNewWithPiece(Number(pieceId));
          }
          if (params['action'] === 'new') {
            this.openNew();
          }
          if (params['search'] === 'fournisseur-date') {
            this.showDateFilter = true;
          }
          this.applyFilter(); this.cdr.markForCheck();
        });
      },
    });
  }

  private loadClients(keyword: string) {
    this.clientSearch$.next(keyword);
  }

  onPieceSearch(keyword: string) {
    this.pieceSearch$.next(keyword.trim());
  }

  private searchPdp(keyword: string): Observable<PieceDetache[]> {
    const base = { page: 0, size: 10, type: 'PDP', statut: 'ACTIF' };
    if (!keyword) {
      return this.pieceService.getAll(base).pipe(map(response => extractContent<PieceDetache>(response)));
    }

    const keywordResults$ = this.pieceService.getAll({ ...base, keyword }).pipe(
      map(response => extractContent<PieceDetache>(response)),
    );
    const depotResults$ = this.pieceService.getAll({ ...base, size: 100, depotNom: keyword }).pipe(
      switchMap(response => {
        const firstPage = extractContent<PieceDetache>(response);
        const page = extractPage<PieceDetache>(response);
        if (!page || page.totalPages <= 1) return of(firstPage);
        const remainingPages = Array.from({ length: page.totalPages - 1 }, (_, index) =>
          this.pieceService.getAll({ ...base, size: 100, page: index + 1, depotNom: keyword }).pipe(
            map(nextResponse => extractContent<PieceDetache>(nextResponse)),
          ),
        );
        return forkJoin(remainingPages).pipe(map(pages => [...firstPage, ...pages.flat()]));
      }),
    );

    return forkJoin({ keyword: keywordResults$, depot: depotResults$ }).pipe(
      map(({ keyword: matchingPieces, depot }) => {
        const piecesById = new Map<number, PieceDetache>();
        [...matchingPieces, ...depot].forEach(piece => piecesById.set(piece.id, piece));
        return [...piecesById.values()];
      }),
    );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.clientSearch$.complete();
    this.pieceSearch$.complete();
  }

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    const params = this.getPageParams();
    this.service.getAll(params).subscribe({
      next: (d) => {
        const arr = this.applyPageResponse<BonDeCommande>(d);
        this.bons = arr.sort((a: any, b: any) => b.id - a.id);
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => this.loading = false,
    });
  }

  applyFilter() {
    let data = this.bons;
    if (this.filterStatut) data = data.filter(b => b.statut === this.filterStatut);
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      data = data.filter(b =>
        b.numero.toLowerCase().includes(kw) ||
        (b.fournisseurNom ?? '').toLowerCase().includes(kw) ||
        (b.immatriculationVehicule ?? '').toLowerCase().includes(kw)
      );
    }
    if (this.dateDebut) {
      data = data.filter(b => b.dateCommande && b.dateCommande >= this.dateDebut);
    }
    if (this.dateFin) {
      data = data.filter(b => b.dateCommande && b.dateCommande.slice(0, 10) <= this.dateFin);
    }
    if (this.filterFournisseur) {
      const fKw = this.filterFournisseur.toLowerCase();
      data = data.filter(b =>
        (b.fournisseurNom ?? '').toLowerCase().includes(fKw) ||
        (b.fournisseurId ? String(b.fournisseurId).includes(fKw) : false)
      );
    }
    this.filtered = data;
    this.page = 1;
  }

  // onSearch inherited from BasePaginatedComponent

  onFilterStatut(e: Event) {
    this.filterStatut = (e.target as HTMLSelectElement).value;
    this.applyFilter(); this.cdr.markForCheck();
  }

  hasReception(bon: BonDeCommande | null): boolean {
    if (!bon) return false;
    return bon.statut === 'INCOMPLET' || bon.statut === 'RECU' || (bon.lignes || []).some(l => (l.quantiteRecue || 0) > 0);
  }

  private makeLigne(id: number | null = null, quantiteRecue = 0): FormGroup {
    const minQty = quantiteRecue > 0 ? quantiteRecue : 1;
    return this.fb.group({
      id: [id],
      quantiteRecue: [quantiteRecue],
      pieceType: ['PDP'],
      pieceDetacheeId: [null],
      designationPds: [''],
      quantite: [minQty, [Validators.required, Validators.min(minQty)]],
      prixUnitaire: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addPieceCatalogue() {
    const piece = this.piecesPdp.find(p => p.id === Number(this.piecePdpAjouter));
    if (!piece) return;

    const ligne = this.makeLigne();
    ligne.patchValue({ pieceDetacheeId: piece.id, quantite: Math.max(1, Number(this.qteAjouterPdp) || 1), prixUnitaire: Number(this.prixAjouterPdp) || 0 });
    this.lignesArray.push(ligne);
    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
  }

  removeLigne(i: number) {
    const ctrl = this.lignesArray.at(i);
    const qRecue = ctrl?.get('quantiteRecue')?.value || 0;
    if (qRecue > 0) {
      this.notifyError(`Impossible de supprimer cette ligne car ${qRecue} pièce(s) ont déjà été réceptionnée(s).`);
      return;
    }
    this.lignesArray.removeAt(i);
  }


  openNew() {
    this.isNew = true;
    this.isReplenishment = false;
    this.editingId = null;
    this.selectedClientId = null;
    this.vehicules = [];
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.fournisseurOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.fournisseurFilter = '';
    this.form.reset({ tvaApplicable: false, observation: '', clientId: null, vehiculeId: null });
    while (this.lignesArray.length) this.lignesArray.removeAt(0);
    this.lignesNonPdpExistantes = [];
    this.piecePdpAjouter = null;
    this.qteAjouterPdp = 1;
    this.prixAjouterPdp = null;
    this.errorMessage = '';
    this.showModal = true;
  }

  openNewWithPiece(pieceId: number) {
    this.openNew();
    this.isReplenishment = true;
    const piece = this.pieces.find(p => p.id === pieceId);
    if (piece) {
      this.prefillReplenishmentPiece(piece);
      return;
    }
    this.pieceService.getById(pieceId).subscribe({
      next: fetchedPiece => {
        this.pieces = [fetchedPiece, ...this.pieces.filter(p => p.id !== fetchedPiece.id)];
        this.prefillReplenishmentPiece(fetchedPiece);
        this.cdr.markForCheck();
      },
      error: () => this.notifyError('Impossible de charger la pièce demandée.'),
    });
  }

  private prefillReplenishmentPiece(piece: PieceDetache) {
    if (piece.type !== 'PDP') {
      this.notifyError('Seules les pièces de rechange (PDP) peuvent être commandées.');
      return;
    }
    const ctrl = this.makeLigne();
    ctrl.patchValue({
      pieceDetacheeId: piece.id,
      prixUnitaire: piece.prix ?? 0,
      quantite: piece.seuilMinimum ? Math.max(1, piece.seuilMinimum - (piece.qteReelle ?? 0)) : 10
    });
    this.lignesArray.push(ctrl);
  }

  openEdit(bon: BonDeCommande) {
    // La liste paginée renvoie un DTO résumé sans lignes ; le formulaire a besoin du détail complet.
    if (!Array.isArray(bon.lignes)) {
      this.isNew = false;
      this.editingId = bon.id;
      this.loadingEdit = true;
      this.errorMessage = '';
      this.showModal = true;
      this.service.getById(bon.id).subscribe({
        next: detail => this.prepareEditForm(detail),
        error: err => {
          this.loadingEdit = false;
          this.showModal = false;
          this.notifyError(err?.error?.message || 'Impossible de charger le bon de commande.');
        },
      });
      return;
    }
    this.prepareEditForm(bon);
  }

  private prepareEditForm(bon: BonDeCommande) {
    const missingPieceIds = [...new Set((bon.lignes ?? [])
      .map(line => line.pieceDetacheeId)
      .filter((id): id is number => id != null && !this.pieces.some(piece => piece.id === id)))];
    if (missingPieceIds.length === 0) {
      this.populateEditForm(bon);
      return;
    }

    this.loadingEdit = true;
    this.showModal = true;
    forkJoin(missingPieceIds.map(id => this.pieceService.getById(id))).subscribe({
      next: fetchedPieces => {
        const piecesById = new Map<number, PieceDetache>();
        [...this.pieces, ...fetchedPieces].forEach(piece => piecesById.set(piece.id, piece));
        this.pieces = [...piecesById.values()];
        this.populateEditForm(bon);
        this.cdr.markForCheck();
      },
      error: err => {
        this.loadingEdit = false;
        this.showModal = false;
        this.notifyError(err?.error?.message || 'Impossible de charger les pièces du bon.');
      },
    });
  }

  private populateEditForm(bon: BonDeCommande) {
    this.loadingEdit = false;
    this.isNew = false;
    this.isReplenishment = false;
    this.editingId = bon.id;
    this.selectedClientId = null;
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.fournisseurOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.fournisseurFilter = '';
    this.form.patchValue({
      fournisseurId: bon.fournisseurId,
      clientId: null,
      vehiculeId: bon.vehiculeId ?? null,
      tvaApplicable: bon.tvaApplicable,
      observation: bon.observation ?? '',
    });
    this.vehicules = [];
    if (bon.vehiculeId) {
      this.vehiculesLoading = true;
      this.vehiculeService.getById(bon.vehiculeId).subscribe({
        next: vehicule => {
          this.vehiculesLoading = false;
          if (!vehicule.client?.id) {
            this.vehicules = [vehicule];
            this.cdr.markForCheck();
            return;
          }
          const clientId = vehicule.client.id;
          this.selectedClientId = clientId;
          this.form.patchValue({ clientId });
          if (!this.clients.some(client => client.id === clientId)) {
            this.clientService.getById(clientId).subscribe({
              next: client => {
                if (this.selectedClientId !== clientId) return;
                this.clients = [client, ...this.clients];
                this.cdr.markForCheck();
              },
            });
          }
          this.loadVehiculesClient(clientId);
        },
        error: () => {
          this.vehiculesLoading = false;
          this.cdr.markForCheck();
        },
      });
    }
    while (this.lignesArray.length) this.lignesArray.removeAt(0);
    this.lignesNonPdpExistantes = [];
    for (const l of bon.lignes) {
      const matchingPiece = this.pieces.find(p => p.id === l.pieceDetacheeId);
      if (matchingPiece?.type !== 'PDP') {
        this.lignesNonPdpExistantes.push(l);
        continue;
      }
      const qRecue = l.quantiteRecue || 0;
      const minQty = qRecue > 0 ? qRecue : 1;
      this.lignesArray.push(this.fb.group({
        id: [l.id],
        quantiteRecue: [qRecue],
        pieceType: ['PDP'],
        pieceDetacheeId: [l.pieceDetacheeId],
        designationPds: [''],
        quantite: [l.quantite, [Validators.required, Validators.min(minQty)]],
        prixUnitaire: [l.prixUnitaire, [Validators.required, Validators.min(0)]],
      }));
    }
    this.errorMessage = '';
    this.showModal = true;
  }

  openDetail(bon: BonDeCommande) { this.selectedBon = bon; }
  closeDetail() { this.selectedBon = null; }

  save() {
    if (!this.form.get('fournisseurId')?.value) {
      this.notifyError('Sélectionnez un fournisseur pour ce bon de commande.');
      return;
    }
    if (this.lignesArray.length === 0) {
      this.notifyError('Veuillez ajouter au moins une ligne de commande.');
      return;
    }
    const lignesRaw = this.form.value.lignes as any[];
    for (const l of lignesRaw) {
      if (!l.pieceDetacheeId) {
        this.notifyError('Sélectionnez une pièce PDP pour chaque ligne.');
        return;
      }
      const qRecue = Number(l.quantiteRecue || 0);
      if (qRecue > 0 && Number(l.quantite) < qRecue) {
        this.notifyError(`La quantité commandée (${l.quantite}) ne peut pas être inférieure à la quantité déjà reçue (${qRecue}).`);
        return;
      }
    }
    this.saving = true;
    const raw = this.form.value;
    const payload = {
      fournisseurId: raw.fournisseurId ? Number(raw.fournisseurId) : null,
      vehiculeId: raw.vehiculeId ? Number(raw.vehiculeId) : null,
      tvaApplicable: !!raw.tvaApplicable,
      observation: raw.observation || undefined,
      lignes: [
        ...this.lignesNonPdpExistantes,
        ...lignesRaw.map((l: any) => ({
          id: l.id ? Number(l.id) : undefined,
          pieceDetacheeId: Number(l.pieceDetacheeId),
          quantite: Number(l.quantite),
          prixUnitaire: Number(l.prixUnitaire),
        })),
      ],
    };
    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    req$.subscribe({
      next: () => { this.showModal = false; this.saving = false; this.load(); this.notify('Bon de commande enregistré.'); },
      error: (err: any) => { this.saving = false; this.notifyError(err?.error?.message || 'Erreur lors de la sauvegarde.'); },
    });
  }

  delete(id: number) {
    const bon = this.bons.find(b => b.id === id);
    if (bon && this.hasReception(bon)) {
      this.notifyError('Impossible de supprimer ce bon de commande : la réception a déjà commencé.');
      return;
    }
    if (!confirm('Supprimer ce bon de commande ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Bon supprimé.'); },
      error: (err: any) => this.notifyError(err?.error?.message || 'Erreur lors de la suppression.'),
    });
  }

  action(type: 'envoyer' | 'receptionner' | 'annuler') {
    if (!this.selectedBon || this.actioning) return;

    // Intercepter "envoyer" si pas de fournisseur
    if (type === 'envoyer' && !this.selectedBon.fournisseurId) {
      this.showAssignFournisseur = true;
      return;
    }

    // Intercepter "receptionner" pour ouvrir le popup bon de réception
    if (type === 'receptionner') {
      this.openReceptionPopup();
      return;
    }

    this.actioning = true;
    this.service[type](this.selectedBon.id).subscribe({
      next: updated => {
        this.selectedBon = updated;
        const idx = this.bons.findIndex(b => b.id === updated.id);
        if (idx !== -1) this.bons[idx] = updated;
        this.applyFilter(); this.cdr.markForCheck();
        this.actioning = false;
        this.notify('Statut mis à jour.');
      },
      error: (err: any) => { this.actioning = false; this.notifyError(err?.error?.message || 'Erreur lors de la mise à jour.'); },
    });
  }

  // ─── Assigner Fournisseur ─────────────────────────────
  getAssignFournisseurName(): string {
    if (!this.assignFournisseurId) return '';
    const f = this.fournisseurs.find(x => x.id === this.assignFournisseurId);
    return f ? (f.nomEntreprise || f.nom || '') : '';
  }

  saveAssignFournisseur() {
    if (!this.selectedBon || !this.assignFournisseurId) return;
    this.assigningFournisseur = true;
    this.service.assignerFournisseur(this.selectedBon.id, Number(this.assignFournisseurId)).subscribe({
      next: (updated) => {
        this.selectedBon = updated;
        const idx = this.bons.findIndex(b => b.id === updated.id);
        if (idx !== -1) this.bons[idx] = updated;
        this.applyFilter(); this.cdr.markForCheck();
        this.assigningFournisseur = false;
        this.showAssignFournisseur = false;
        this.assignFournisseurId = null;
        this.notify('Fournisseur assigné. Vous pouvez maintenant envoyer la commande.');
      },
      error: (err: any) => {
        this.assigningFournisseur = false;
        this.notifyError(err?.error?.message || 'Erreur assignation fournisseur.');
      },
    });
  }

  // ─── Bon de Réception ─────────────────────────────────
  openReceptionPopup() {
    if (!this.selectedBon) return;
    this.receptionLignes = this.selectedBon.lignes
      .map(l => {
        const restante = l.quantite - (l.quantiteRecue || 0);
        return {
          ligneId: l.id!,
          designationPiece: l.designationPiece || l.reference || '',
          reference: l.reference || '',
          quantiteCommandee: restante,
          quantiteRecue: restante,
        };
      })
      .filter(l => l.quantiteCommandee > 0);
    this.showReceptionModal = true;
  }

  saveReception() {
    if (!this.selectedBon) return;
    this.receptionSaving = true;
    const request: ReceptionBonDeCommandeRequest = {
      lignes: this.receptionLignes.map(l => ({
        ligneId: l.ligneId,
        quantiteRecue: l.quantiteRecue,
      }))
    };
    this.service.receptionnerAvecReception(this.selectedBon.id, request).subscribe({
      next: (updated) => {
        this.selectedBon = updated;
        const idx = this.bons.findIndex(b => b.id === updated.id);
        if (idx !== -1) this.bons[idx] = updated;
        this.applyFilter(); this.cdr.markForCheck();
        this.receptionSaving = false;
        this.showReceptionModal = false;
        this.notify('Bon de réception enregistré. Les pièces ont été ajoutées au stock.');
      },
      error: (err: any) => {
        this.receptionSaving = false;
        this.notifyError(err?.error?.message || 'Erreur réception.');
      },
    });
  }

  downloadPdf(id: number) {
    this.service.downloadPdf(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bon-commande-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  get montantHTForm(): number {
    return this.lignesArray.controls.reduce((sum: number, c: any) => {
      return sum + (Number(c.get('quantite')?.value) || 0) * (Number(c.get('prixUnitaire')?.value) || 0);
    }, 0);
  }

  get montantTVAForm(): number {
    return this.form.get('tvaApplicable')?.value ? this.montantHTForm * 0.18 : 0;
  }

  get montantTTCForm(): number { return this.montantHTForm + this.montantTVAForm; }

  getPieceLabel(pieceId: number | null | undefined): string {
    const p = this.pieces.find(x => x.id === pieceId);
    return p ? `${p.designation} — ${p.designation}` : '';
  }

  statutClass(s: StatutBonCommande): string {
    const m: Record<StatutBonCommande, string> = {
      EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
      ENVOYE: 'bg-blue-100 text-blue-700',
      INCOMPLET: 'bg-orange-100 text-orange-700',
      RECU: 'bg-green-100 text-green-700',
      ANNULE: 'bg-red-100 text-red-700',
    };
    return m[s] ?? '';
  }

  statutLabel(s: StatutBonCommande): string {
    const m: Record<StatutBonCommande, string> = {
      EN_ATTENTE: 'En attente', ENVOYE: 'Envoyé', INCOMPLET: 'Incomplet', RECU: 'Réceptionné', ANNULE: 'Annulé',
    };
    return m[s] ?? s;
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n); }

  get paged(): BonDeCommande[] {
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
