import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BonDeCommandeService, BonDeCommande, StatutBonCommande, BonDeLivraisonRequest, BonDeLivraisonLigne } from '../services/bon-de-commande.service';
import { FournisseurService } from '../services/fournisseur.service';
import { VehiculeService } from '../services/vehicule.service';
import { PieceDetacheeService } from '../services/piece-detachee.service';
import { ClientService, UserModel } from '../services/client.service';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FournisseurModel, VehiculeModel, PieceDetache } from '../shared/models';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideArrowRight } from '@lucide/angular';

@Component({
  selector: 'app-bons-commande',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, NgClass],
  templateUrl: './bons-commande.component.html',
})
export class BonsCommandeComponent implements OnInit {
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
  clients: UserModel[] = [];

  page = 1;
  readonly pageSize = 10;

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
  isNew = true;
  isReplenishment = false;
  editingId: number | null = null;
  selectedBon: BonDeCommande | null = null;
  actioning = false;

  // Bon de Livraison popup
  showLivraisonModal = false;
  livraisonLignes: { ligneId: number; designationPiece: string; reference: string; quantiteCommandee: number; quantiteRecue: number; }[] = [];
  livraisonSaving = false;

  // Assigner fournisseur popup
  showAssignFournisseur = false;
  assignFournisseurId: number | null = null;
  assigningFournisseur = false;

  searchTerm = '';
  filterStatut = '';
  successMessage = '';
  errorMessage = '';

  form: FormGroup = this.fb.group({
    fournisseurId: [null],
    clientId: [null],
    vehiculeId: [null],
    tvaApplicable: [false],
    observation: [''],
    lignes: this.fb.array([]),
  });

  get lignesArray(): FormArray { return this.form.get('lignes') as FormArray; }

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

  get filteredClients(): UserModel[] {
    if (!this.clientFilter) return this.clients;
    const kw = this.clientFilter.toLowerCase();
    return this.clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(kw) ||
      (c.phone ?? '').toLowerCase().includes(kw)
    );
  }

  get filteredVehicules(): VehiculeModel[] {
    const base = this.selectedClientId
      ? this.vehicules.filter(v => v.client?.id === this.selectedClientId)
      : this.vehicules;
    if (!this.vehiculeFilter) return base;
    const kw = this.vehiculeFilter.toLowerCase();
    return base.filter(v =>
      v.immatriculation.toLowerCase().includes(kw) ||
      `${v.marque} ${v.modele}`.toLowerCase().includes(kw)
    );
  }

  selectClient(c: UserModel | null) {
    this.selectedClientId = c?.id ?? null;
    this.form.patchValue({ clientId: c?.id ?? null, vehiculeId: null });
    this.clientFilter = '';
    this.clientOpen = false;
  }

  selectVehicule(v: VehiculeModel | null) {
    this.form.patchValue({ vehiculeId: v?.id ?? null });
    this.vehiculeFilter = '';
    this.vehiculeOpen = false;
  }

  get displayedPieces(): PieceDetache[] {
    return this.pieces.filter(p => p.type !== 'PDS' && p.statut === 'ACTIF');
  }

  ngOnInit() {
    this.load();
    forkJoin({
      fournisseurs: this.fournisseurService.getAll(),
      vehicules: this.vehiculeService.getAll(),
      pieces: this.pieceService.getAll(),
      clients: this.clientService.getAll(),
    }).subscribe({
      next: ({ fournisseurs, vehicules, pieces, clients }) => {
        this.fournisseurs = fournisseurs.filter(f => !f.archived);
        this.vehicules = vehicules;
        this.pieces = pieces;
        this.clients = clients.filter(c => c.enabled);

        // Pre-fill BDC if query parameter pieceId is present
        this.route.queryParams.subscribe(params => {
          const pieceId = params['pieceId'];
          if (pieceId) {
            this.openNewWithPiece(Number(pieceId));
          }
        });
      },
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (d) => { this.bons = d.sort((a: any, b: any) => b.id - a.id); this.applyFilter(); this.loading = false; },
      error: () => this.loading = false,
    });
  }

  applyFilter() {
    let data = this.bons;
    if (this.filterStatut) data = data.filter(b => b.statut === this.filterStatut);
    if (this.searchTerm) {
      const kw = this.searchTerm;
      data = data.filter(b =>
        b.numero.toLowerCase().includes(kw) ||
        b.fournisseurNom.toLowerCase().includes(kw) ||
        (b.immatriculationVehicule ?? '').toLowerCase().includes(kw)
      );
    }
    this.filtered = data;
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  onFilterStatut(e: Event) {
    this.filterStatut = (e.target as HTMLSelectElement).value;
    this.applyFilter();
  }

  private makeLigne(): FormGroup {
    return this.fb.group({
      isCustom: [false],
      pieceDetacheeId: [null],
      designationPds: [''],
      quantite: [1, [Validators.required, Validators.min(1)]],
      prixUnitaire: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addLigne() { this.lignesArray.push(this.makeLigne()); }
  removeLigne(i: number) { this.lignesArray.removeAt(i); }

  toggleCustom(i: number) {
    const ctrl = this.lignesArray.at(i);
    const current = !!ctrl.get('isCustom')?.value;
    ctrl.patchValue({ isCustom: !current, pieceDetacheeId: null, designationPds: '' });
  }

  openNew() {
    this.isNew = true;
    this.isReplenishment = false;
    this.editingId = null;
    this.selectedClientId = null;
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.fournisseurOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.fournisseurFilter = '';
    this.form.reset({ tvaApplicable: false, observation: '', clientId: null, vehiculeId: null });
    while (this.lignesArray.length) this.lignesArray.removeAt(0);
    this.addLigne();
    this.errorMessage = '';
    this.showModal = true;
  }

  openNewWithPiece(pieceId: number) {
    this.openNew();
    this.isReplenishment = true;
    const piece = this.pieces.find(p => p.id === pieceId);
    if (piece) {
      const ctrl = this.lignesArray.at(0);
      ctrl.patchValue({
        pieceDetacheeId: piece.id,
        prixUnitaire: piece.prix ?? 0,
        quantite: piece.seuilMinimum ? Math.max(1, piece.seuilMinimum - (piece.qteReelle ?? 0)) : 10
      });
    }
  }

  openEdit(bon: BonDeCommande) {
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
    while (this.lignesArray.length) this.lignesArray.removeAt(0);
    for (const l of bon.lignes) {
      const matchingPiece = this.pieces.find(p => p.id === l.pieceDetacheeId && p.type !== 'PDS');
      const isCustom = !matchingPiece;
      this.lignesArray.push(this.fb.group({
        isCustom: [isCustom],
        pieceDetacheeId: [isCustom ? null : l.pieceDetacheeId],
        designationPds: [isCustom ? (l.designationPiece || l.reference || '') : ''],
        quantite: [l.quantite, [Validators.required, Validators.min(1)]],
        prixUnitaire: [l.prixUnitaire, [Validators.required, Validators.min(0)]],
      }));
    }
    this.errorMessage = '';
    this.showModal = true;
  }

  openDetail(bon: BonDeCommande) { this.selectedBon = bon; }
  closeDetail() { this.selectedBon = null; }

  save() {
    if (this.lignesArray.length === 0) {
      this.notifyError('Veuillez ajouter au moins une ligne de commande.');
      return;
    }
    const lignesRaw = this.form.value.lignes as any[];
    for (const l of lignesRaw) {
      if (l.isCustom && !l.designationPds?.trim()) {
        this.notifyError('Saisissez une désignation pour les pièces personnalisées.');
        return;
      }
      if (!l.isCustom && !l.pieceDetacheeId) {
        this.notifyError('Sélectionnez une pièce pour chaque ligne du catalogue.');
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
      lignes: lignesRaw.map((l: any) => {
        if (l.isCustom) {
          return {
            designationPds: l.designationPds.trim(),
            typePiece: 'PDS',
            quantite: Number(l.quantite),
            prixUnitaire: Number(l.prixUnitaire),
          };
        }
        return {
          pieceDetacheeId: Number(l.pieceDetacheeId),
          quantite: Number(l.quantite),
          prixUnitaire: Number(l.prixUnitaire),
        };
      }),
    };
    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    req$.subscribe({
      next: () => { this.showModal = false; this.load(); this.notify('Bon de commande enregistré.'); },
      error: (err: any) => { this.saving = false; this.notifyError(err?.error?.message || 'Erreur lors de la sauvegarde.'); },
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce bon de commande ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Bon supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  action(type: 'envoyer' | 'receptionner' | 'annuler') {
    if (!this.selectedBon || this.actioning) return;

    // Intercepter "envoyer" si pas de fournisseur
    if (type === 'envoyer' && !this.selectedBon.fournisseurId) {
      this.showAssignFournisseur = true;
      return;
    }

    // Intercepter "receptionner" pour ouvrir le popup bon de livraison
    if (type === 'receptionner') {
      this.openLivraisonPopup();
      return;
    }

    this.actioning = true;
    this.service[type](this.selectedBon.id).subscribe({
      next: updated => {
        this.selectedBon = updated;
        const idx = this.bons.findIndex(b => b.id === updated.id);
        if (idx !== -1) this.bons[idx] = updated;
        this.applyFilter();
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
        this.applyFilter();
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

  // ─── Bon de Livraison ─────────────────────────────────
  openLivraisonPopup() {
    if (!this.selectedBon) return;
    this.livraisonLignes = this.selectedBon.lignes
      .map(l => {
        const restante = l.quantite - (l.quantiteRecue || 0);
        return {
          ligneId:            l.id!,
          designationPiece:   l.designationPiece || l.reference || '',
          reference:          l.reference || '',
          quantiteCommandee:  restante,
          quantiteRecue:      restante,
        };
      })
      .filter(l => l.quantiteCommandee > 0);
    this.showLivraisonModal = true;
  }

  saveLivraison() {
    if (!this.selectedBon) return;
    this.livraisonSaving = true;
    const request: BonDeLivraisonRequest = {
      lignes: this.livraisonLignes.map(l => ({
        ligneId: l.ligneId,
        quantiteRecue: l.quantiteRecue,
      }))
    };
    this.service.receptionnerAvecLivraison(this.selectedBon.id, request).subscribe({
      next: (updated) => {
        this.selectedBon = updated;
        const idx = this.bons.findIndex(b => b.id === updated.id);
        if (idx !== -1) this.bons[idx] = updated;
        this.applyFilter();
        this.livraisonSaving = false;
        this.showLivraisonModal = false;
        this.notify('Bon de livraison enregistré. Les pièces ont été ajoutées au stock.');
      },
      error: (err: any) => {
        this.livraisonSaving = false;
        this.notifyError(err?.error?.message || 'Erreur réception livraison.');
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
    return this.lignesArray.controls.reduce((sum, c) => {
      return sum + (Number(c.get('quantite')?.value) || 0) * (Number(c.get('prixUnitaire')?.value) || 0);
    }, 0);
  }

  get montantTVAForm(): number {
    return this.form.get('tvaApplicable')?.value ? this.montantHTForm * 0.18 : 0;
  }

  get montantTTCForm(): number { return this.montantHTForm + this.montantTVAForm; }

  getPieceName(id: any): string {
    const p = this.pieces.find(x => x.id === Number(id));
    return p ? `${p.reference} — ${p.numeroDeSerie}` : '';
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
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  private notify(msg: string) {
    this.saving = false; this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.saving = false; this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
