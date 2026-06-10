import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BonDeCommandeService, BonDeCommande, StatutBonCommande } from '../services/bon-de-commande.service';
import { FournisseurService } from '../services/fournisseur.service';
import { VehiculeService } from '../services/vehicule.service';
import { PieceDetacheeService } from '../services/piece-detachee.service';
import { NgClass } from '@angular/common';
import { FournisseurModel, VehiculeModel, PieceDetache } from '../shared/models';

@Component({
  selector: 'app-bons-commande',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './bons-commande.component.html',
})
export class BonsCommandeComponent implements OnInit {
  private service = inject(BonDeCommandeService);
  private fournisseurService = inject(FournisseurService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private fb = inject(FormBuilder);

  bons: BonDeCommande[] = [];
  filtered: BonDeCommande[] = [];
  fournisseurs: FournisseurModel[] = [];
  vehicules: VehiculeModel[] = [];
  pieces: PieceDetache[] = [];

  loading = true;
  saving = false;
  showModal = false;
  isNew = true;
  editingId: number | null = null;
  selectedBon: BonDeCommande | null = null;
  actioning = false;

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  filterStatut = '';
  successMessage = '';
  errorMessage = '';

  form: FormGroup = this.fb.group({
    fournisseurId: [null, Validators.required],
    vehiculeId: [null],
    tvaApplicable: [false],
    observation: [''],
    lignes: this.fb.array([]),
  });

  get lignesArray(): FormArray { return this.form.get('lignes') as FormArray; }

  ngOnInit() {
    this.load();
    forkJoin({
      fournisseurs: this.fournisseurService.getAll(),
      vehicules: this.vehiculeService.getAll(),
      pieces: this.pieceService.getAll(),
    }).subscribe({
      next: ({ fournisseurs, vehicules, pieces }) => {
        this.fournisseurs = fournisseurs.filter(f => !f.archived);
        this.vehicules = vehicules;
        this.pieces = pieces;
      },
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.bons = data; this.applyFilter(); this.loading = false; },
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
      pieceDetacheeId: [null, Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
      prixUnitaire: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addLigne() { this.lignesArray.push(this.makeLigne()); }
  removeLigne(i: number) { this.lignesArray.removeAt(i); }

  openNew() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset({ tvaApplicable: false, observation: '' });
    while (this.lignesArray.length) this.lignesArray.removeAt(0);
    this.addLigne();
    this.showModal = true;
  }

  openEdit(bon: BonDeCommande) {
    this.isNew = false;
    this.editingId = bon.id;
    this.form.patchValue({
      fournisseurId: bon.fournisseurId,
      vehiculeId: bon.vehiculeId ?? null,
      tvaApplicable: bon.tvaApplicable,
      observation: bon.observation ?? '',
    });
    while (this.lignesArray.length) this.lignesArray.removeAt(0);
    for (const l of bon.lignes) {
      this.lignesArray.push(this.fb.group({
        pieceDetacheeId: [l.pieceDetacheeId, Validators.required],
        quantite: [l.quantite, [Validators.required, Validators.min(1)]],
        prixUnitaire: [l.prixUnitaire, [Validators.required, Validators.min(0)]],
      }));
    }
    this.showModal = true;
  }

  openDetail(bon: BonDeCommande) {
    this.selectedBon = bon;
  }

  closeDetail() { this.selectedBon = null; }

  save() {
    if (this.form.invalid || this.lignesArray.length === 0) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const raw = this.form.value;
    const payload = {
      fournisseurId: Number(raw.fournisseurId),
      vehiculeId: raw.vehiculeId ? Number(raw.vehiculeId) : null,
      tvaApplicable: !!raw.tvaApplicable,
      observation: raw.observation || undefined,
      lignes: raw.lignes.map((l: any) => ({
        pieceDetacheeId: Number(l.pieceDetacheeId),
        quantite: Number(l.quantite),
        prixUnitaire: Number(l.prixUnitaire),
      })),
    };
    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    req$.subscribe({
      next: () => { this.showModal = false; this.load(); this.notify('Bon de commande enregistré.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la sauvegarde.'); },
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
      error: () => { this.actioning = false; this.notifyError('Erreur lors de la mise à jour.'); },
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
      RECU: 'bg-green-100 text-green-700',
      ANNULE: 'bg-red-100 text-red-700',
    };
    return m[s] ?? '';
  }

  statutLabel(s: StatutBonCommande): string {
    const m: Record<StatutBonCommande, string> = {
      EN_ATTENTE: 'En attente', ENVOYE: 'Envoyé', RECU: 'Réceptionné', ANNULE: 'Annulé',
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
