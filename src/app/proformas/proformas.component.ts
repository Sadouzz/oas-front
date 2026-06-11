import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ProformaService, Proforma } from '../services/proforma.service';
import { ClientService } from '../services/client.service';
import { VehiculeService } from '../services/vehicule.service';
import { PieceDetacheeService } from '../services/piece-detachee.service';
import { MainDoeuvreService } from '../services/main-doeuvre.service';
import { NgClass } from '@angular/common';
import { UserModel, VehiculeModel, PieceDetache, MainDoeuvreModel } from '../shared/models';

@Component({
  selector: 'app-proformas',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './proformas.component.html',
})
export class ProformasComponent implements OnInit {
  private service = inject(ProformaService);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private mdService = inject(MainDoeuvreService);
  private fb = inject(FormBuilder);

  proformas: Proforma[] = [];
  filtered: Proforma[] = [];
  clients: UserModel[] = [];
  vehicules: VehiculeModel[] = [];
  clientVehicules: VehiculeModel[] = [];
  pieces: PieceDetache[] = [];
  mainsDoeuvre: MainDoeuvreModel[] = [];

  loading = true;
  saving = false;
  showModal = false;
  isNew = true;
  editingId: number | null = null;
  selectedProforma: Proforma | null = null;

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  successMessage = '';
  errorMessage = '';

  form: FormGroup = this.fb.group({
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
    tvaRate: [null],
    montantTimbre: [0],
    montantAutre: [0],
    lignesPieces: this.fb.array([]),
    lignesMainDoeuvres: this.fb.array([]),
  });

  get lignesPiecesArray(): FormArray { return this.form.get('lignesPieces') as FormArray; }
  get lignesMDArray(): FormArray { return this.form.get('lignesMainDoeuvres') as FormArray; }

  ngOnInit() {
    this.load();
    forkJoin({
      clients: this.clientService.getAll(),
      vehicules: this.vehiculeService.getAll(),
      pieces: this.pieceService.getAll(),
      mds: this.mdService.getAll(),
    }).subscribe({
      next: ({ clients, vehicules, pieces, mds }) => {
        this.clients = clients;
        this.vehicules = vehicules;
        this.pieces = pieces;
        this.mainsDoeuvre = mds.filter(m => !m.isArchived);
      },
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.proformas = data; this.applyFilter(); this.loading = false; },
      error: () => this.loading = false,
    });
  }

  applyFilter() {
    if (!this.searchTerm) { this.filtered = this.proformas; this.page = 1; return; }
    const kw = this.searchTerm.toLowerCase();
    this.filtered = this.proformas.filter(p =>
      p.numero.toLowerCase().includes(kw) ||
      p.clientNom.toLowerCase().includes(kw) ||
      (p.immatriculation ?? '').toLowerCase().includes(kw)
    );
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  onClientChange() {
    const clientId = Number(this.form.get('clientId')?.value);
    this.clientVehicules = this.vehicules.filter(v => v.client?.id === clientId);
    this.form.patchValue({ vehiculeId: null, immatriculation: '', numeroChassis: '', marque: '', modele: '', annee: null });
  }

  onVehiculeChange() {
    const vehiculeId = Number(this.form.get('vehiculeId')?.value);
    const v = this.vehicules.find(x => x.id === vehiculeId);
    if (v) {
      this.form.patchValue({
        immatriculation: v.immatriculation,
        numeroChassis: v.numeroChassis,
        marque: v.marque,
        modele: v.modele,
        annee: v.annee,
        kilometrage: v.kilometrage ?? 0,
      });
    }
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
    this.clientVehicules = [];
    this.form.reset({ kilometrage: 0, montantTimbre: 0, montantAutre: 0 });
    while (this.lignesPiecesArray.length) this.lignesPiecesArray.removeAt(0);
    while (this.lignesMDArray.length) this.lignesMDArray.removeAt(0);
    this.showModal = true;
  }

  openEdit(p: Proforma) {
    this.isNew = false;
    this.editingId = p.id;
    const clientId = p.clientId;
    this.clientVehicules = this.vehicules.filter(v => v.client?.id === clientId);
    this.form.patchValue({
      clientId: p.clientId,
      vehiculeId: p.vehiculeId ?? null,
      kilometrage: p.kilometrage,
      immatriculation: p.immatriculation ?? '',
      numeroChassis: p.numeroChassis ?? '',
      marque: p.marque ?? '',
      modele: p.modele ?? '',
      annee: p.annee ?? null,
      numeroBonDeCommande: p.numeroBonDeCommande ?? '',
      remarque: p.remarque ?? '',
      tvaRate: null,
      montantTimbre: p.montantTimbre,
      montantAutre: p.montantAutre,
    });
    while (this.lignesPiecesArray.length) this.lignesPiecesArray.removeAt(0);
    for (const l of p.lignesPieces) {
      this.lignesPiecesArray.push(this.fb.group({
        pieceId: [l.pieceId, Validators.required],
        quantite: [l.quantite, [Validators.required, Validators.min(1)]],
        prix: [l.prix, [Validators.required, Validators.min(0)]],
      }));
    }
    while (this.lignesMDArray.length) this.lignesMDArray.removeAt(0);
    for (const l of p.lignesMainDoeuvres) {
      this.lignesMDArray.push(this.fb.group({
        mainDoeuvreId: [l.mainDoeuvreId, Validators.required],
        nbreHeure: [l.nbreHeure, [Validators.required, Validators.min(1)]],
        tarifHoraire: [l.tarifHoraire, [Validators.required, Validators.min(0)]],
      }));
    }
    this.showModal = true;
  }

  openDetail(p: Proforma) { this.selectedProforma = p; }
  closeDetail() { this.selectedProforma = null; }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
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
      tvaRate: raw.tvaRate ? Number(raw.tvaRate) : null,
      montantTimbre: Number(raw.montantTimbre) || 0,
      montantAutre: Number(raw.montantAutre) || 0,
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
      next: () => { this.showModal = false; this.load(); this.notify('Proforma enregistré.'); },
      error: () => { this.saving = false; this.notifyError('Erreur lors de la sauvegarde.'); },
    });
  }

  convertToFacture(id: number) {
    if (!confirm('Convertir ce proforma en facture TTC ?')) return;
    this.service.convertToFacture(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Proforma converti en facture.'); },
      error: () => this.notifyError('Erreur lors de la conversion.'),
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

  get totalPieces(): number {
    return this.lignesPiecesArray.controls.reduce((s, c) =>
      s + (Number(c.get('quantite')?.value) || 0) * (Number(c.get('prix')?.value) || 0), 0);
  }

  get totalMD(): number {
    return this.lignesMDArray.controls.reduce((s, c) =>
      s + (Number(c.get('nbreHeure')?.value) || 0) * (Number(c.get('tarifHoraire')?.value) || 0), 0);
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): Proforma[] {
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
