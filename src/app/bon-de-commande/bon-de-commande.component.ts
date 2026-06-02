import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { BonDeCommandeService } from '../services/bon-de-commande.service';
import { FournisseurService } from '../services/fournisseur.service';
import { VehiculeService } from '../services/vehicule.service';
import { PieceDetacheeService } from '../services/piece-detachee.service';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bon-de-commande',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './bon-de-commande.component.html',
})
export class BonDeCommandeComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bcService = inject(BonDeCommandeService);
  private fournisseurService = inject(FournisseurService);
  private vehiculeService = inject(VehiculeService);
  private pieceService = inject(PieceDetacheeService);
  private authService = inject(AuthService);

  bons: any[] = [];
  fournisseurs: any[] = [];
  vehicules: any[] = [];
  pdps: any[] = [];

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  showCreate = false;
  showDetail = false;
  selected: any = null;

  form = this.fb.group({
    fournisseurId: [null as number | null, Validators.required],
    vehiculeId: [null as number | null],
    tvaApplicable: [true],
    observation: [''],
    lignes: this.fb.array([]),
  });

  get lignes(): FormArray { return this.form.get('lignes') as FormArray; }
  // Helper used from the template to iterate over FormArray controls (pattern used elsewhere in the project)
  get fLignes() { return this.lignes.controls; }

  ngOnInit() {
    this.loadAll();
    this.fournisseurService.getAll().subscribe({ next: (d) => this.fournisseurs = d });
    this.pieceService.getAll({ type: 'PDP', statut: 'ACTIF' }).subscribe({ next: (d) => this.pdps = d });
  }

  loadAll() {
    this.loading = true;
    this.bcService.getAll().subscribe({ next: (d) => { this.bons = d; this.loading = false; }, error: () => this.loading = false });
  }

  openCreate() {
    this.form.reset({ tvaApplicable: true, observation: '' });
    while (this.lignes.length) this.lignes.removeAt(0);
    this.addLigne();
    this.showCreate = true;
  }

  closeCreate() { this.showCreate = false; this.errorMessage = ''; }

  addLigne() { this.lignes.push(this.fb.group({ pieceDetacheeId: [null], quantite: [1, [Validators.required, Validators.min(1)]], prixUnitaire: [0, [Validators.required, Validators.min(0)]] })); }

  removeLigne(i: number) { if (this.lignes.length > 1) this.lignes.removeAt(i); }

  save() {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const val = this.form.value as any;
    this.bcService.create({
      fournisseurId: val.fournisseurId,
      vehiculeId: val.vehiculeId,
      tvaApplicable: val.tvaApplicable,
      observation: val.observation,
      lignes: val.lignes,
    }).subscribe({
      next: () => { this.saving = false; this.success('Bon créé'); this.closeCreate(); this.loadAll(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur'; }
    });
  }

  openDetail(b: any) { this.selected = b; this.showDetail = true; }
  closeDetail() { this.showDetail = false; this.selected = null; }

  downloadPdf(b: any) {
    this.bcService.downloadPdf(b.id).subscribe({ next: (blob) => { const url = window.URL.createObjectURL(blob); window.open(url); }, error: () => this.errorMessage = 'Erreur téléchargement PDF' });
  }

  private success(msg: string) { this.successMessage = msg; this.errorMessage = ''; setTimeout(() => this.successMessage = '', 3000); }
}
