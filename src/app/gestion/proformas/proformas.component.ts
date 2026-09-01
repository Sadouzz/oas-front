import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ProformaService, Proforma } from '../../services/proforma.service';
import { BonDeCommandeService, BonDeCommande } from '../../services/bon-de-commande.service';
import { ClientService } from '../../services/client.service';
import { VehiculeService } from '../../services/vehicule.service';
import { PieceDetacheeService } from '../../services/piece-detachee.service';
import { MainDoeuvreService } from '../../services/main-doeuvre.service';
import { NgClass } from '@angular/common';
import { UserModel, VehiculeModel, PieceDetache, MainDoeuvreModel } from '../../shared/models/index';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideArrowRight } from '@lucide/angular';

@Component({
  selector: 'app-proformas',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass, LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX],
  templateUrl: './proformas.component.html',
})
export class ProformasComponent implements OnInit {
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
  clients: UserModel[] = [];
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

  clientOpen = false;
  vehiculeOpen = false;
  clientFilter = '';
  vehiculeFilter = '';

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  statutFilter = '';
  successMessage = '';
  errorMessage = '';

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
      bonsCommande: this.bcService.getAll(),
    }).subscribe({
      next: ({ clients, vehicules, pieces, mds, bonsCommande }) => {
        this.clients = clients;
        this.vehicules = vehicules;
        this.pieces = pieces;
        this.mainsDoeuvre = mds.filter(m => !m.isArchived);
        this.bonsCommande = bonsCommande;

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
              // Si pas encore chargé, on peut faire un refetch
              this.service.getById(id).subscribe(prof => {
                if (prof) this.openEdit(prof);
              });
            }
          }
        });
      },
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => { this.proformas = data.sort((a:any, b:any) => b.id - a.id); this.applyFilter(); this.loading = false; },
      error: () => this.loading = false,
    });
  }

  applyFilter() {
    let list = this.proformas;
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        p.numero.toLowerCase().includes(kw) ||
        p.clientNom.toLowerCase().includes(kw) ||
        (p.immatriculation ?? '').toLowerCase().includes(kw)
      );
    }
    if (this.statutFilter) {
      list = list.filter(p => p.statut === this.statutFilter);
    }
    this.filtered = list;
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim();
    this.applyFilter();
  }

  onStatutFilterChange(e: Event) {
    this.statutFilter = (e.target as HTMLSelectElement).value;
    this.applyFilter();
  }

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
    if (!this.vehiculeFilter) return this.clientVehicules;
    const kw = this.vehiculeFilter.toLowerCase();
    return this.clientVehicules.filter(v =>
      v.immatriculation.toLowerCase().includes(kw) ||
      `${v.marque} ${v.modele}`.toLowerCase().includes(kw)
    );
  }

  selectClient(c: UserModel) {
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

  private makeLignePiece(): FormGroup {
    return this.fb.group({
      isCustom: [false],
      designationPds: [''],
      pieceId: [null],
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

  togglePieceCustom(i: number) {
    const ctrl = this.lignesPiecesArray.at(i);
    const val = ctrl.get('isCustom')?.value;
    ctrl.patchValue({ isCustom: !val, pieceId: null, designationPds: '' });
  }

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
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.bcLinked = false;
    this.bcOpen = false;
    this.bcFilter = '';
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
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.clientFilter = '';
    this.vehiculeFilter = '';
    this.bcOpen = false;
    this.bcFilter = '';
    const linkedBC = p.numeroBonDeCommande
      ? this.bonsCommande.find(b => b.numero === p.numeroBonDeCommande) ?? null
      : null;
    this.bcLinked = !!linkedBC;
    this.form.patchValue({
      bonDeCommandeId: linkedBC?.id ?? null,
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
        isCustom: [l.isCustom ?? false],
        designationPds: [l.designationPds ?? ''],
        pieceId: [l.pieceId],
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
      lignesPieces: this.lignesPiecesArray.getRawValue().map((l: any) => ({
        pieceId: l.isCustom ? null : l.pieceId,
        isCustom: l.isCustom,
        custom: l.isCustom,
        designationPds: l.designationPds,
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

  get totalPieces(): number {
    return this.lignesPiecesArray.controls.reduce((s, c) =>
      s + (Number(c.get('quantite')?.value) || 0) * (Number(c.get('prix')?.value) || 0), 0);
  }

  get totalMD(): number {
    return this.lignesMDArray.controls.reduce((s, c) =>
      s + (Number(c.get('nbreHeure')?.value) || 0) * (Number(c.get('tarifHoraire')?.value) || 0), 0);
  }

  get montantBonCommandeForm(): number {
    const id = this.form.get('bonDeCommandeId')?.value;
    if (!id) return 0;
    return this.bonsCommande.find(b => b.id === Number(id))?.montantTTC ?? 0;
  }

  totalAvecBC(p: Proforma): number {
    const bc = this.bonsCommande.find(b => b.numero === p.numeroBonDeCommande);
    return (bc?.montantTTC ?? 0) + p.montantTotal;
  }

  get montantBCDetail(): number {
    if (!this.selectedProforma?.numeroBonDeCommande) return 0;
    return this.bonsCommande.find(b => b.numero === this.selectedProforma!.numeroBonDeCommande)?.montantTTC ?? 0;
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
