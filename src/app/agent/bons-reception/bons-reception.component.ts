import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { BonDeReceptionService, BonDeReception } from './bon-de-reception.service';
import { BonDeCommandeService, BonDeCommande } from '../bons-commande/bon-de-commande.service';
import { VehiculeService } from '../vehicules/vehicule.service';
import { NgClass } from '@angular/common';
import { VehiculeModel, extractContent } from '../../shared/models/index';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideTruck } from '@lucide/angular';

@Component({
  selector: 'app-bons-reception',
  imports: [NgClass],
  templateUrl: './bons-reception.component.html',
})
export class BonsReceptionComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(BonDeReceptionService);
  private bcService = inject(BonDeCommandeService);
  private vehiculeService = inject(VehiculeService);

  bons: BonDeReception[] = [];
  filtered: BonDeReception[] = [];
  bonsCommande: BonDeCommande[] = [];
  allVehicules: VehiculeModel[] = [];

  loading = true;
  selectedBon: BonDeReception | null = null;

  page = 1;
  readonly pageSize = 10;
  searchTerm = '';
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.load();
    forkJoin({
      bonsCommande: this.bcService.getAll(),
      vehicules: this.vehiculeService.getAll(),
    }).subscribe({
      next: ({ bonsCommande, vehicules }) => {
        this.bonsCommande = extractContent(bonsCommande);
        this.allVehicules = extractContent(vehicules);
      },
    });
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: data => {
        this.bons = extractContent(data).sort((a: any, b: any) => b.id - a.id);
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
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
    this.cdr.markForCheck();
  }

  openDetail(bon: BonDeReception) { this.selectedBon = bon; }
  closeDetail() { this.selectedBon = null; }

  delete(id: number) {
    if (!confirm('Supprimer ce bon de réception ?')) return;
    this.service.delete(id).subscribe({
      next: () => { this.load(); this.closeDetail(); this.notify('Bon de réception supprimé.'); },
      error: () => this.notifyError('Erreur lors de la suppression.'),
    });
  }

  downloadPdf(id: number) {
    this.service.downloadPdf(id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bon-reception-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  totalAvecBC(bon: BonDeReception): number {
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

  formatDate(d: string): string { return new Date(d).toLocaleDateString('fr-FR'); }
  fmt(n: number): string { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

  get paged(): BonDeReception[] {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage() { if (this.page > 1) this.page--; }
  nextPage() { if (this.page < this.totalPages) this.page++; }

  private notify(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
