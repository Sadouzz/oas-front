import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BonDeLivraisonService, BonDeLivraison } from '../services/bon-de-livraison.service';
import { BonDeCommandeService, BonDeCommande } from '../services/bon-de-commande.service';
import { PieceDetacheeService } from '../services/piece-detachee.service';
import { MainDoeuvreService } from '../services/main-doeuvre.service';
import { VehiculeService } from '../services/vehicule.service';
import { NgClass } from '@angular/common';
import { PieceDetache, MainDoeuvreModel, VehiculeModel } from '../shared/models';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideTruck } from '@lucide/angular';

@Component({
  selector: 'app-bons-livraison',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideTruck],
  templateUrl: './bons-livraison.component.html',
})
export class BonsLivraisonComponent implements OnInit {
  private service = inject(BonDeLivraisonService);
  private bcService = inject(BonDeCommandeService);
  private pieceService = inject(PieceDetacheeService);
  private mdService = inject(MainDoeuvreService);
  private vehiculeService = inject(VehiculeService);
  private fb = inject(FormBuilder);

  bons: BonDeLivraison[] = [];
  filtered: BonDeLivraison[] = [];
  bonsCommande: BonDeCommande[] = [];
  pieces: PieceDetache[] = [];
  mainsDoeuvre: MainDoeuvreModel[] = [];
  allVehicules: VehiculeModel[] = [];

  loading = true;
  saving = false;
  showModal = false;
  isNew = true;
  editingId: number | null = null;
  selectedBon: BonDeLivraison | null = null;

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  successMessage = '';
  errorMessage = '';

  form: FormGroup = this.fb.group({
    bonDeCommandeId: [null],
    kilometrage: [null, [Validators.required, Validators.min(0)]],
    remarque: [''],
    paye: [false],
    lignesPieces: this.fb.array([]),
    lignesMainDoeuvres: this.fb.array([]),
  });

  get lignesPiecesArray(): FormArray { return this.form.get('lignesPieces') as FormArray; }
  get lignesMDArray(): FormArray { return this.form.get('lignesMainDoeuvres') as FormArray; }

  ngOnInit() {
    this.load();
    forkJoin({
      bonsCommande: this.bcService.getAll(),
      pieces: this.pieceService.getAll(),
      mds: this.mdService.getAll(),
      vehicules: this.vehiculeService.getAll(),
    }).subscribe({
      next: ({ bonsCommande, pieces, mds, vehicules }) => {
        this.bonsCommande = bonsCommande;
        this.pieces = pieces;
        this.mainsDoeuvre = mds.filter(m => !m.isArchived);
        this.allVehicules = vehicules;
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
    if (!this.searchTerm) { this.filtered = this.bons; this.page = 1; return; }
    const kw = this.searchTerm;
    this.filtered = this.bons.filter(b =>
      b.numero.toLowerCase().includes(kw) ||
      (b.agentNom ?? '').toLowerCase().includes(kw) ||
      (b.bonDeCommandeNumero ?? '').toLowerCase().includes(kw)
    );
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  private makeLignePiece(): FormGroup {
    return this.fb.group({
      pieceId: [null, Validators.required],
      quantite: [1, [Validators.required, Validators.min(1)]],
      prix: [0, [Validators.required, Validators.min(0)]],
    });
  }

  private makeLigneMD(): FormGroup {
    return this.fb.group({
      mainDoeuvreId: [null, Validators.required],
      nbreHeure: [1, [Validators.required, Validators.min(1)]],
      tarifHoraire: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addPiece() { this.lignesPiecesArray.push(this.makeLignePiece()); }
  removePiece(i: number) { this.lignesPiecesArray.removeAt(i); }
  addMD() { this.lignesMDArray.push(this.makeLigneMD()); }
  removeMD(i: number) { this.lignesMDArray.removeAt(i); }

  onPieceChange(i: number) {
    const ctrl = this.lignesPiecesArray.at(i);
    const pieceId = Number(ctrl.get('pieceId')?.value);
    const piece = this.pieces.find(p => p.id === pieceId);
    if (piece?.prix) ctrl.patchValue({ prix: piece.prix });
  }

  onMDChange(i: number) {
    const ctrl = this.lignesMDArray.at(i);
    const mdId = Number(ctrl.get('mainDoeuvreId')?.value);
    const md = this.mainsDoeuvre.find(m => m.id === mdId);
    if (md) ctrl.patchValue({ tarifHoraire: md.prix, nbreHeure: md.nbreHeure });
  }

  openNew() {
    this.isNew = true;
    this.editingId = null;
    this.form.reset({ paye: false, remarque: '' });
    while (this.lignesPiecesArray.length) this.lignesPiecesArray.removeAt(0);
    while (this.lignesMDArray.length) this.lignesMDArray.removeAt(0);
    this.showModal = true;
  }

  openEdit(bon: BonDeLivraison) {
    this.isNew = false;
    this.editingId = bon.id;
    this.form.patchValue({
      bonDeCommandeId: bon.bonDeCommandeId ?? null,
      kilometrage: bon.kilometrage,
      remarque: bon.remarque ?? '',
      paye: bon.paye,
    });
    while (this.lignesPiecesArray.length) this.lignesPiecesArray.removeAt(0);
    for (const l of bon.lignesPieces) {
      this.lignesPiecesArray.push(this.fb.group({
        pieceId: [l.pieceId, Validators.required],
        quantite: [l.quantite, [Validators.required, Validators.min(1)]],
        prix: [l.prix, [Validators.required, Validators.min(0)]],
      }));
    }
    while (this.lignesMDArray.length) this.lignesMDArray.removeAt(0);
    for (const l of bon.lignesMainDoeuvres) {
      this.lignesMDArray.push(this.fb.group({
        mainDoeuvreId: [l.mainDoeuvreId, Validators.required],
        nbreHeure: [l.nbreHeure, [Validators.required, Validators.min(1)]],
        tarifHoraire: [l.tarifHoraire, [Validators.required, Validators.min(0)]],
      }));
    }
    this.showModal = true;
  }

  openDetail(bon: BonDeLivraison) { this.selectedBon = bon; }
  closeDetail() { this.selectedBon = null; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const raw = this.form.value;
    const payload = {
      bonDeCommandeId: raw.bonDeCommandeId ? Number(raw.bonDeCommandeId) : null,
      kilometrage: Number(raw.kilometrage),
      remarque: raw.remarque || undefined,
      paye: !!raw.paye,
      lignesPieces: raw.lignesPieces.map((l: any) => ({
        pieceId: Number(l.pieceId),
        quantite: Number(l.quantite),
        prix: Number(l.prix),
      })),
      lignesMainDoeuvres: raw.lignesMainDoeuvres.map((l: any) => ({
        mainDoeuvreId: Number(l.mainDoeuvreId),
        nbreHeure: Number(l.nbreHeure),
        tarifHoraire: Number(l.tarifHoraire),
      })),
    };
    const req$ = this.isNew
      ? this.service.create(payload)
      : this.service.update(this.editingId!, payload);
    req$.subscribe({
      next: () => { this.showModal = false; this.load(); this.notify('Bon de livraison enregistré.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la sauvegarde.'); },
    });
  }

  delete(id: number) {
    if (!confirm('Supprimer ce bon de livraison ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Bon supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  downloadPdf(id: number) {
    this.service.downloadPdf(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bon-livraison-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  get totalPieces(): number {
    return this.lignesPiecesArray.controls.reduce((s, c) =>
      s + (Number(c.get('quantite')?.value) || 0) * (Number(c.get('prix')?.value) || 0), 0);
  }

  get totalMD(): number {
    return this.lignesMDArray.controls.reduce((s, c) =>
      s + (Number(c.get('nbreHeure')?.value) || 0) * (Number(c.get('tarifHoraire')?.value) || 0), 0);
  }

  get montantBonCommande(): number {
    const id = this.form.get('bonDeCommandeId')?.value;
    if (!id) return 0;
    return this.bonsCommande.find(b => b.id === Number(id))?.montantTTC ?? 0;
  }

  totalAvecBC(bon: BonDeLivraison): number {
    const bcAmount = bon.bonDeCommandeId
      ? this.bonsCommande.find(b => b.id === bon.bonDeCommandeId)?.montantTTC ?? 0
      : 0;
    return bcAmount + bon.montantTotal;
  }

  get detailVehicule(): VehiculeModel | null {
    if (!this.selectedBon?.bonDeCommandeId) return null;
    const bc = this.bonsCommande.find(b => b.id === this.selectedBon!.bonDeCommandeId);
    if (!bc?.vehiculeId) return null;
    return this.allVehicules.find(v => v.id === bc.vehiculeId) ?? null;
  }

  get detailClient() {
    return this.detailVehicule?.client ?? null;
  }

  get montantBCDetail(): number {
    if (!this.selectedBon?.bonDeCommandeId) return 0;
    return this.bonsCommande.find(b => b.id === this.selectedBon!.bonDeCommandeId)?.montantTTC ?? 0;
  }

  getPieceName(id: any): string {
    const p = this.pieces.find(x => x.id === Number(id));
    return p ? `${p.reference} — ${p.numeroDeSerie}` : '';
  }

  getMDName(id: any): string {
    const m = this.mainsDoeuvre.find(x => x.id === Number(id));
    return m ? `${m.categorie}` : '';
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): BonDeLivraison[] {
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
