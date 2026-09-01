import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { AvoirTTCService, AvoirTTC } from '../../services/avoir-ttc.service';
import { ClientService, UserModel } from '../../services/client.service';
import { VehiculeService, VehiculeModel } from '../../services/vehicule.service';
import { PieceDetacheeService, PieceDetache } from '../../services/piece-detachee.service';
import { MainDoeuvreService, MainDoeuvreModel } from '../../services/main-doeuvre.service';
import { AuthService } from '../auth/services/auth.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { LucideSearch, LucidePlus, LucideTrash2, LucideX, LucideDownload, LucideEye, LucideLoader2 } from '@lucide/angular';

@Component({
  selector: 'app-avoirs-ttc',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DecimalPipe, DatePipe, PaginationComponent, AlertComponent,
    LucideSearch, LucidePlus, LucideTrash2, LucideX, LucideDownload, LucideEye, LucideLoader2],
  templateUrl: './avoirs-ttc.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './avoirs-ttc.css',
})
export class AvoirsTtc implements OnInit {
  private service = inject(AvoirTTCService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private clientService = inject(ClientService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private moService = inject(MainDoeuvreService);
  private authService = inject(AuthService);

  avoirs: AvoirTTC[] = [];
  filtered: AvoirTTC[] = [];
  loading = true;
  saving = false;
  selectedAvoir: AvoirTTC | null = null;
  showCreateModal = false;
  showDetailModal = false;

  clients: UserModel[] = [];
  allVehicules: VehiculeModel[] = [];
  vehiculesFiltres: VehiculeModel[] = [];
  pdps: PieceDetache[] = [];
  mainDoeuvres: MainDoeuvreModel[] = [];

  clientOpen = false;
  vehiculeOpen = false;
  clientFilter = '';
  vehiculeFilter = '';

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  successMessage = '';
  errorMessage = '';

  form = this.fb.group({
    clientId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null],
    kilometrage: [0],
    remarque: [''],
    appliquerTVA: [true],
    montantTimbre: [0],
    lignesPieces: this.fb.array([]),
    lignesMainDoeuvres: this.fb.array([]),
  });

  get lignesPieces(): FormArray { return this.form.get('lignesPieces') as FormArray; }
  get lignesMainDoeuvres(): FormArray { return this.form.get('lignesMainDoeuvres') as FormArray; }

  get clientLabel(): string {
    const id = this.form.get('clientId')?.value;
    if (!id) return '';
    const c = this.clients.find(x => x.id === Number(id));
    return c ? `${c.firstName} ${c.lastName}` : '';
  }

  get vehiculeLabel(): string {
    const id = this.form.get('vehiculeId')?.value;
    if (!id) return '';
    const v = this.allVehicules.find(x => x.id === Number(id));
    return v ? `${v.immatriculation} — ${v.marque} ${v.modele}` : '';
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
    if (!this.vehiculeFilter) return this.vehiculesFiltres;
    const kw = this.vehiculeFilter.toLowerCase();
    return this.vehiculesFiltres.filter(v =>
      v.immatriculation.toLowerCase().includes(kw) ||
      `${v.marque} ${v.modele}`.toLowerCase().includes(kw)
    );
  }

  ngOnInit() {
    this.load();
    forkJoin({
      clients: this.clientService.getAll(),
      vehicules: this.vehiculeService.getAll(),
      pdps: this.pieceService.getAll({ type: 'PDP' }),
      mos: this.moService.getAll()
    }).subscribe({
      next: ({ clients, vehicules, pdps, mos }) => {
        this.clients = clients.filter(c => c.enabled);
        this.allVehicules = vehicules;
        this.pdps = pdps.filter(p => p.statut === 'ACTIF');
        this.mainDoeuvres = mos;
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openCreate();
      }
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (d) => {
        this.avoirs = (d || []).sort((a, b) => b.id - a.id);
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erreur lors du chargement des avoirs TTC.';
      }
    });
  }

  applyFilter() {
    let data = this.avoirs;
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      data = data.filter(a =>
        (a.numero ?? '').toLowerCase().includes(kw) ||
        (a.clientNom ?? '').toLowerCase().includes(kw) ||
        (a.immatriculation ?? '').toLowerCase().includes(kw)
      );
    }
    this.filtered = data;
    this.page = 1;
  }

  onSearch(e: Event) {
    this.searchTerm = (e.target as HTMLInputElement).value.trim();
    this.applyFilter();
  }

  get paged(): AvoirTTC[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

  selectClient(c: UserModel) {
    this.form.patchValue({ clientId: c.id, vehiculeId: null });
    this.vehiculesFiltres = this.allVehicules.filter(v => v.client?.id === c.id);
    this.clientFilter = '';
    this.clientOpen = false;
  }

  selectVehicule(v: VehiculeModel) {
    this.form.patchValue({ vehiculeId: v.id });
    this.vehiculeFilter = '';
    this.vehiculeOpen = false;
  }

  openCreate() {
    this.form.reset({
      clientId: null,
      vehiculeId: null,
      kilometrage: 0,
      remarque: '',
      appliquerTVA: true,
      montantTimbre: 0
    });
    while (this.lignesPieces.length) this.lignesPieces.removeAt(0);
    while (this.lignesMainDoeuvres.length) this.lignesMainDoeuvres.removeAt(0);
    this.addPiece();
    this.vehiculesFiltres = [];
    this.clientOpen = false;
    this.vehiculeOpen = false;
    this.errorMessage = '';
    this.showCreateModal = true;
  }

  closeCreate() {
    this.showCreateModal = false;
    this.errorMessage = '';
  }

  addPiece() {
    this.lignesPieces.push(this.fb.group({
      pieceId: [null as number | null],
      pieceRef: [''],
      designationPds: [''],
      quantite: [1, [Validators.required, Validators.min(1)]],
      prix: [0, [Validators.required, Validators.min(0)]],
    }));
  }

  removePiece(i: number) {
    this.lignesPieces.removeAt(i);
  }

  onPieceInput(index: number, event: Event) {
    const ref = (event.target as HTMLInputElement).value.trim();
    const found = this.pdps.find(p => p.reference.toLowerCase() === ref.toLowerCase());
    const ctrl = this.lignesPieces.at(index);
    if (found) {
      ctrl.patchValue({
        pieceId: found.id,
        designationPds: found.designation,
        prix: found.prix ?? 0
      }, { emitEvent: false });
    } else {
      ctrl.patchValue({ pieceId: null }, { emitEvent: false });
    }
  }

  addMainDoeuvre() {
    this.lignesMainDoeuvres.push(this.fb.group({
      mainDoeuvreId: [null as number | null],
      nbreHeure: [1, [Validators.required, Validators.min(1)]],
      tarifHoraire: [0, [Validators.required, Validators.min(0)]],
    }));
  }

  removeMainDoeuvre(i: number) {
    this.lignesMainDoeuvres.removeAt(i);
  }

  onMoSelect(index: number, event: Event) {
    const id = Number((event.target as HTMLSelectElement).value);
    const found = this.mainDoeuvres.find(m => m.id === id);
    const ctrl = this.lignesMainDoeuvres.at(index);
    if (found) {
      ctrl.patchValue({
        tarifHoraire: found.prix ?? 0
      }, { emitEvent: false });
    }
  }

  get totalHT(): number {
    let sum = 0;
    for (const ctrl of this.lignesPieces.controls) {
      const q = ctrl.get('quantite')?.value || 0;
      const p = ctrl.get('prix')?.value || 0;
      sum += q * p;
    }
    for (const ctrl of this.lignesMainDoeuvres.controls) {
      const h = ctrl.get('nbreHeure')?.value || 0;
      const t = ctrl.get('tarifHoraire')?.value || 0;
      sum += h * t;
    }
    return sum;
  }

  get totalTVA(): number {
    return this.form.get('appliquerTVA')?.value ? Math.round(this.totalHT * 0.18) : 0;
  }

  get totalTTC(): number {
    const timbre = Number(this.form.get('montantTimbre')?.value) || 0;
    return this.totalHT + this.totalTVA + timbre;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Veuillez remplir correctement les champs obligatoires.';
      return;
    }

    const val = this.form.value as any;
    const lignesPieces = (val.lignesPieces ?? [])
      .map((l: any) => ({
        pieceId: l.pieceId,
        designationPds: l.designationPds || l.pieceRef,
        isCustom: !l.pieceId,
        quantite: l.quantite,
        prix: l.prix
      }));

    const lignesMainDoeuvres = (val.lignesMainDoeuvres ?? [])
      .map((l: any) => ({
        mainDoeuvreId: l.mainDoeuvreId,
        nbreHeure: l.nbreHeure,
        tarifHoraire: l.tarifHoraire
      }));

    if (lignesPieces.length === 0 && lignesMainDoeuvres.length === 0) {
      this.errorMessage = 'Veuillez ajouter au moins une pièce ou une main d\'œuvre.';
      return;
    }

    this.saving = true;
    this.service.create({
      clientId: val.clientId,
      vehiculeId: val.vehiculeId,
      kilometrage: val.kilometrage,
      remarque: val.remarque,
      appliquerTVA: val.appliquerTVA,
      montantTimbre: val.montantTimbre,
      lignesPieces,
      lignesMainDoeuvres
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showSuccess('Avoir TTC créé avec succès ! Les pièces ont été réintégrées en stock.');
        this.closeCreate();
        this.load();
      },
      error: (err: any) => {
        this.saving = false;
        const msg = err.error?.message ?? (typeof err.error === 'string' ? err.error : '');
        this.errorMessage = msg || 'Erreur lors de la création de l\'avoir TTC.';
      }
    });
  }

  openDetail(a: AvoirTTC) {
    this.selectedAvoir = a;
    this.showDetailModal = true;
  }

  closeDetail() {
    this.showDetailModal = false;
    this.selectedAvoir = null;
  }

  downloadPdf(a: AvoirTTC) {
    this.service.downloadPdf(a.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `AvoirTTC_${a.numero || a.id}.pdf`;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage = 'Erreur lors du téléchargement du PDF.';
      }
    });
  }

  deleteAvoir(a: AvoirTTC) {
    if (!confirm(`Supprimer l'avoir ${a.numero} ?`)) return;
    this.service.delete(a.id).subscribe({
      next: () => {
        this.showSuccess(`Avoir ${a.numero} supprimé.`);
        this.load();
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la suppression.';
      }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 4000);
  }

  get fPieces() { return this.lignesPieces.controls; }
  get fMo() { return this.lignesMainDoeuvres.controls; }
}
