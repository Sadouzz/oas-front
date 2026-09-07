import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { BonDeReceptionService } from './bon-de-reception.service';
import { BonDeReception } from './models/bon-de-reception.model';
import { BonDeCommandeService } from '../bons-commande/bon-de-commande.service';
import { BonDeCommande } from '../bons-commande/models/bon-de-commande.model';
import { VehiculeService } from '../vehicules/vehicule.service';
import { NgClass } from '@angular/common';
import { VehiculeModel, extractContent } from '../../shared/models/index';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { LucideSearch, LucidePlus, LucidePencil, LucideTrash2, LucideX, LucideDownload, LucideTruck } from '@lucide/angular';

@Component({
  selector: 'app-bons-reception',
  imports: [NgClass, PaginationComponent],
  templateUrl: './bons-reception.component.html',
})
export class BonsReceptionComponent extends BasePaginatedComponent implements OnInit {
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
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.loadData();
    forkJoin({
      //bonsCommande: this.bcService.getAll(),
      //vehicules: this.vehiculeService.getAll(),
    }).subscribe({
      next: ({ bonsCommande, vehicules }) => {
        this.bonsCommande = extractContent(bonsCommande);
        this.allVehicules = extractContent(vehicules);
      },
    });
  }

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getAll(this.getPageParams()).subscribe({
      next: data => {
        const list = this.applyPageResponse<BonDeReception>(data);
        this.bons = list.sort((a: any, b: any) => b.id - a.id);
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.bons = [];
        this.filtered = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilter() {
    let data = this.bons;
    if (this.searchTerm) {
      const kw = this.searchTerm.toLowerCase();
      data = data.filter(b =>
        b.numero.toLowerCase().includes(kw) ||
        (b.agentNom ?? '').toLowerCase().includes(kw) ||
        (b.bonDeCommandeNumero ?? '').toLowerCase().includes(kw)
      );
    }
    this.filtered = data;
  }

  // onSearch is inherited from BasePaginatedComponent

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
    return this.filtered;
  }

  private notify(msg: string) {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = '', 3500);
  }
  private notifyError(msg: string) {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = '', 3500);
  }
}
