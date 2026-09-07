import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BonDeSortieService } from '../bon-de-sortie.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../../shared/components/base-paginated.component';
import { LucideSearch, LucideLoader2 } from '@lucide/angular';
import { BonDeSortieHistorique } from '../models/bon-de-sortie.model';

@Component({
  selector: 'app-historique-bs',
  standalone: true,
  imports: [FormsModule, RouterLink, PaginationComponent, LucideSearch, LucideLoader2],
  templateUrl: './historique-bs.component.html',
})
export class HistoriqueBsComponent extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private bonService = inject(BonDeSortieService);

  historiqueList: BonDeSortieHistorique[] = [];
  filtered: BonDeSortieHistorique[] = [];
  override readonly pageSize = 15;

  loading = false;
  filterStatut = '';
  periodePreset = 'all';
  dateDebut = '';
  dateFin = '';
  filterPiece = '';

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadHistorique();
  }

  loadHistorique() {
    this.loading = true;
    this.cdr.markForCheck();
    this.bonService.getHistoriqueGlobal(this.getPageParams()).subscribe({
      next: (data) => {
        const list = this.applyPageResponse<BonDeSortieHistorique>(data);
        this.historiqueList = list;
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.historiqueList = [];
        this.filtered = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPresetChange() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (this.periodePreset === 'today') {
      this.dateDebut = todayStr;
      this.dateFin = todayStr;
    } else if (this.periodePreset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      this.dateDebut = d.toISOString().slice(0, 10);
      this.dateFin = todayStr;
    } else if (this.periodePreset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      this.dateDebut = d.toISOString().slice(0, 10);
      this.dateFin = todayStr;
    } else if (this.periodePreset === 'this_month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      this.dateDebut = d.toISOString().slice(0, 10);
      this.dateFin = todayStr;
    } else if (this.periodePreset === 'all') {
      this.dateDebut = '';
      this.dateFin = '';
    }
    this.applyFilter();
    this.cdr.markForCheck();
  }

  applyFilter() {
    this.filtered = this.historiqueList.filter(h => {
      const q = this.searchTerm;
      const action = h.action || h.statut || '';
      const matchesSearch = !q ||
        h.prenom?.toLowerCase().includes(q) ||
        h.nom?.toLowerCase().includes(q) ||
        h.numBs?.toLowerCase().includes(q) ||
        h.numeroSerie?.toLowerCase().includes(q) ||
        h.immatriculation?.toLowerCase().includes(q) ||
        h.designation?.toLowerCase().includes(q) ||
        action.toLowerCase().includes(q) ||
        h.bonDeSortie?.reference?.toLowerCase().includes(q) ||
        h.piece?.reference?.toLowerCase().includes(q);

      const matchesStatut = !this.filterStatut || action === this.filterStatut;

      // Filter by Piece
      const matchesPiece = !this.filterPiece ||
        h.numeroSerie?.toLowerCase().includes(this.filterPiece.toLowerCase()) ||
        h.designation?.toLowerCase().includes(this.filterPiece.toLowerCase()) ||
        h.piece?.reference?.toLowerCase().includes(this.filterPiece.toLowerCase()) ||
        h.piece?.designation?.toLowerCase().includes(this.filterPiece.toLowerCase());

      // Filter by Dates
      let matchesDate = true;
      if (h.dateAction) {
        const itemDate = h.dateAction.slice(0, 10);
        if (this.dateDebut && itemDate < this.dateDebut) {
          matchesDate = false;
        }
        if (this.dateFin && itemDate > this.dateFin) {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesStatut && matchesPiece && matchesDate;
    });
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterStatut || this.filterPiece || this.dateDebut || this.dateFin || this.periodePreset !== 'all');
  }

  resetFilters() {
    this.searchTerm = '';
    this.filterStatut = '';
    this.periodePreset = 'all';
    this.dateDebut = '';
    this.dateFin = '';
    this.filterPiece = '';
    this.page = 1;
    this.loadData();
  }

  // onSearch is inherited from BasePaginatedComponent

  get paged(): BonDeSortieHistorique[] {
    return this.filtered;
  }

  statutClass(statut?: string): string {
    switch (statut) {
      case 'SORTIE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SORTIE ATELIER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RETOUR':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR');
  }

  exportCSV() {
    const headers = ['Prénom', 'Nom', 'N° de BS', 'N° de série', "N° d'immatriculation", 'Désignation', 'Action', 'Quantité', 'Stock magasin', 'Stock atelier', 'Stock réel', 'Date'];
    const rows = this.filtered.map(h => [
      h.prenom || h.bonDeSortie?.client?.firstName || h.agent?.firstName || '',
      h.nom || h.bonDeSortie?.client?.lastName || h.agent?.lastName || '',
      h.numBs || h.bonDeSortie?.reference || '',
      h.numeroSerie || h.piece?.reference || '',
      h.immatriculation || h.bonDeSortie?.vehicule?.immatriculation || '',
      h.designation || h.piece?.designation || h.piece?.reference || '',
      h.action || h.statut || '',
      h.quantite != null ? h.quantite : '',
      h.stockMagasin != null ? h.stockMagasin : '',
      h.stockAtelier != null ? h.stockAtelier : '',
      h.qteReelle != null ? h.qteReelle : ((h.stockMagasin || 0) + (h.stockAtelier || 0)),
      h.dateAction ? this.formatDate(h.dateAction) : ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historique_bons_de_sortie_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
