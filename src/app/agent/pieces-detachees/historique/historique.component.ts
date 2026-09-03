import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { StockService, PieceMouvementListResponse } from '../stock.service';
import { PieceDetacheeService, PieceDetache, AlerteStock } from '../piece-detachee.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { extractContent } from '../../../shared/models';
import { LucideSearch } from '@lucide/angular';

type ModalType = 'entree' | 'sortie' | 'ajustement' | null;

@Component({
  selector: 'app-historique-stock',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, AlertComponent, SearchableSelectComponent, PaginationComponent, LucideSearch],
  templateUrl: './historique.component.html',
})
export class HistoriqueComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private pieceService = inject(PieceDetacheeService);

  alertes: AlerteStock[] = [];
  alertePage = 1;
  readonly pageSize = 10;
  mouvementsRecents: PieceMouvementListResponse[] = [];
  pdps: PieceDetache[] = [];
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  // Advanced Filters
  searchQuery = '';
  filterPieceId = '';
  filterCategorie = '';
  filterType = '';
  periodePreset = 'all';
  dateDebut = '';
  dateFin = '';

  mouvPage = 1;
  mouvPageSize = 15;

  get categoriesPDP(): string[] {
    return Array.from(new Set(this.pdps.map(p => p.categorie && typeof p.categorie === 'object' ? p.categorie.nom : p.categorie))).filter(c => !!c).sort();
  }

  get categoriesPDPOptions(): { id: string; nom: string }[] {
    return this.categoriesPDP.map(c => ({ id: c, nom: c }));
  }

  getPieceLabel = (p: PieceDetache) => p ? `${p.reference} - ${p.designation}` : '';

  modalType: ModalType = null;

  mouvementForm = this.fb.group({
    pieceId: [null as number | null, Validators.required],
    quantite: [null as number | null, [Validators.required, Validators.min(1)]],
    motif: [''],
  });

  ajustementForm = this.fb.group({
    pieceId: [null as number | null, Validators.required],
    stockMagasin: [null as number | null, [Validators.required, Validators.min(0)]],
    stockAtelier: [null as number | null, [Validators.required, Validators.min(0)]],
    motif: [''],
  });

  ngOnInit() {
    this.loadAll();
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
    this.loadMovementsRecent();
  }

  loadAll() {
    this.loading = true;
    this.stockService.alertes().subscribe({ next: (d) => { this.alertes = extractContent(d); this.checkDone(); }, error: () => this.checkDone() });
    this.pieceService.getAll({ type: 'PDP' }).subscribe({ next: (d) => { this.pdps = extractContent(d); this.checkDone(); }, error: () => this.checkDone() });
    this.loadMovementsRecent();
  }

  private loadCount = 0;
  private checkDone() { if (++this.loadCount >= 2) this.loading = false; this.cdr.markForCheck(); }

  loadMovementsRecent() {
    const pId = this.filterPieceId ? parseInt(this.filterPieceId, 10) : undefined;
    const cat = this.filterCategorie || undefined;
    const typ = this.filterType || undefined;
    const deb = this.dateDebut ? new Date(this.dateDebut + 'T00:00:00').toISOString() : undefined;
    const fin = this.dateFin ? new Date(this.dateFin + 'T23:59:59').toISOString() : undefined;

    this.stockService.historiqueGlobal(deb, fin, pId, cat, typ).subscribe({
      next: (d) => {
        this.mouvementsRecents = extractContent(d);
        this.mouvPage = 1;
        this.cdr.markForCheck();
      },
      error: () => {
        this.mouvementsRecents = [];
        this.cdr.markForCheck();
      }
    });
  }

  get filteredMouvements(): PieceMouvementListResponse[] {
    if (!this.searchQuery) return this.mouvementsRecents;
    const q = this.searchQuery.toLowerCase();
    return this.mouvementsRecents.filter(m =>
      m.prenom?.toLowerCase().includes(q) ||
      m.nom?.toLowerCase().includes(q) ||
      m.numDoc?.toLowerCase().includes(q) ||
      m.typeDoc?.toLowerCase().includes(q) ||
      m.numeroSerie?.toLowerCase().includes(q) ||
      m.immatriculation?.toLowerCase().includes(q) ||
      m.designation?.toLowerCase().includes(q) ||
      m.action?.toLowerCase().includes(q)
    );
  }

  get pagedMouvements(): PieceMouvementListResponse[] {
    const start = (this.mouvPage - 1) * this.mouvPageSize;
    return this.filteredMouvements.slice(start, start + this.mouvPageSize);
  }

  get mouvTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredMouvements.length / this.mouvPageSize));
  }

  prevMouvPage(): void { if (this.mouvPage > 1) this.mouvPage--; }
  nextMouvPage(): void { if (this.mouvPage < this.mouvTotalPages) this.mouvPage++; }

  get hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.filterPieceId || this.filterCategorie || this.filterType || this.periodePreset !== 'all' || this.dateDebut || this.dateFin);
  }

  resetFilters() {
    this.searchQuery = '';
    this.filterPieceId = '';
    this.filterCategorie = '';
    this.filterType = '';
    this.periodePreset = 'all';
    this.dateDebut = '';
    this.dateFin = '';
    this.loadMovementsRecent();
  }

  get ruptures(): AlerteStock[] { return (Array.isArray(this.alertes) ? this.alertes : []).filter(a => a.typeAlerte === 'RUPTURE'); }
  get stocksFaibles(): AlerteStock[] { return (Array.isArray(this.alertes) ? this.alertes : []).filter(a => a.typeAlerte === 'STOCK_FAIBLE'); }

  get pagedAlertes(): AlerteStock[] { const list = Array.isArray(this.alertes) ? this.alertes : []; return list.slice((this.alertePage - 1) * this.pageSize, this.alertePage * this.pageSize); }
  get alertesTotalPages(): number { const list = Array.isArray(this.alertes) ? this.alertes : []; return Math.max(1, Math.ceil(list.length / this.pageSize)); }
  prevAlertePage(): void { if (this.alertePage > 1) this.alertePage--; }
  nextAlertePage(): void { if (this.alertePage < this.alertesTotalPages) this.alertePage++; }

  openModal(type: ModalType) {
    this.modalType = type;
    this.mouvementForm.reset();
    this.ajustementForm.reset();
    this.errorMessage = '';
  }

  closeModal() { this.modalType = null; }

  submitMouvement() {
    if (this.mouvementForm.invalid || this.saving) { this.mouvementForm.markAllAsTouched(); return; }
    this.saving = true;
    const { pieceId, quantite, motif } = this.mouvementForm.value;
    const obs = this.modalType === 'entree'
      ? this.stockService.entree(pieceId!, quantite!, motif ?? '')
      : this.stockService.sortie(pieceId!, quantite!, motif ?? '');
    obs.subscribe({
      next: () => { this.saving = false; this.showSuccess(this.modalType === 'entree' ? 'Entrée enregistrée !' : 'Sortie enregistrée !'); this.closeModal(); this.loadAll(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  submitAjustement() {
    if (this.ajustementForm.invalid || this.saving) { this.ajustementForm.markAllAsTouched(); return; }
    this.saving = true;
    const { pieceId, stockMagasin, stockAtelier, motif } = this.ajustementForm.value;
    this.stockService.ajustement(pieceId!, stockMagasin!, stockAtelier!, motif ?? '').subscribe({
      next: () => { this.saving = false; this.showSuccess('Ajustement enregistré !'); this.closeModal(); this.loadAll(); },
      error: (err: any) => { this.saving = false; this.errorMessage = err.error?.message || 'Erreur.'; }
    });
  }

  typeMouvClass(type?: string | null): string {
    if (!type) return 'bg-gray-50 text-gray-700 border-gray-200';
    const c: Record<string, string> = {
      ENTREE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      RETOUR_MAGASIN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      SORTIE_MAGASIN: 'bg-blue-50 text-blue-700 border-blue-200',
      SORTIE_ATELIER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      SORTIE_MAGASIN_VERS_ATELIER: 'bg-blue-50 text-blue-700 border-blue-200',
      SORTIE_ATELIER_VALIDEE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      SORTIE_REELLE: 'bg-red-50 text-red-700 border-red-200',
      AJUSTEMENT: 'bg-purple-50 text-purple-700 border-purple-200',
      MODIFICATION_PRIX: 'bg-gray-50 text-gray-700 border-gray-200',
      INVENTAIRE: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return c[type] ?? 'bg-gray-50 text-gray-700 border-gray-200';
  }

  typeMouvLabel(type?: string | null): string {
    if (!type) return '—';
    const labels: Record<string, string> = {
      ENTREE: 'Entrée',
      RETOUR_MAGASIN: 'Retour Magasin',
      SORTIE_MAGASIN: 'Sortie Magasin',
      SORTIE_ATELIER: 'Sortie Atelier',
      SORTIE_MAGASIN_VERS_ATELIER: 'Sortie (Magasin → Atelier)',
      SORTIE_ATELIER_VALIDEE: 'Sortie Atelier Validée',
      SORTIE_REELLE: 'Sortie Réelle',
      AJUSTEMENT: 'Ajustement',
      MODIFICATION_PRIX: 'Modification Prix',
      INVENTAIRE: 'Inventaire',
    };
    return labels[type] ?? type;
  }

  formatDate(d?: string | null): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('fr-FR');
  }

  exportCSV() {
    const headers = ['Prenom', 'Nom', 'Num doc', 'Type doc', 'N° de série', "N° d'immatriculation", 'Désignation', 'Action', 'Quantité', 'Stock magasin', 'Stock atelier', 'Stock réel', 'Date'];
    const rows = this.filteredMouvements.map(m => [
      m.prenom || '',
      m.nom || '',
      m.numDoc || '',
      m.typeDoc || '',
      m.numeroSerie || '',
      m.immatriculation || '',
      m.designation || '',
      this.typeMouvLabel(m.action),
      m.quantite != null ? m.quantite : '',
      m.stockMagasin != null ? m.stockMagasin : '',
      m.stockAtelier != null ? m.stockAtelier : '',
      m.stockReel != null ? m.stockReel : '',
      m.date ? this.formatDate(m.date) : ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `historique_pieces_detachees_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private showSuccess(msg: string) {
    this.successMessage = msg; this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3500);
  }

  get fm() { return this.mouvementForm.controls; }
  get fa() { return this.ajustementForm.controls; }
}

// Export alias for backward compatibility
export { HistoriqueComponent as StockComponent };
