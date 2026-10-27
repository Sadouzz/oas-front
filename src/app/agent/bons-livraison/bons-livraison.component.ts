import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../shared/components/searchable-select/searchable-select.component';
import { OrdreReparationService } from '../ordres-reparation/ordre-reparation.service';
import { BonDeLivraison, BonDeLivraisonService, BonDeSortieDisponible } from './bon-de-livraison.service';

@Component({
  selector: 'app-bons-livraison', standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent, PaginationComponent, SearchableSelectComponent],
  template: `
<div>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-oas-ink">Bons de Livraison</h1>
      <p class="text-sm text-oas-muted mt-1">{{ totalElements }} bon(s) de livraison</p>
    </div>
    <button type="button" (click)="openCreate()"
      class="bg-oas-accent hover:bg-oas-accent-dark text-white font-bold px-4 h-11 rounded-lg flex items-center gap-2 transition cursor-pointer">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
      Nouveau bon
    </button>
  </div>

  <app-alert [success]="successMessage" [error]="errorMessage" />

  <div class="bg-white rounded-lg border border-oas-line p-3 mb-4 shadow-sm">
    <div class="relative">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-oas-muted">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="m20 20-4-4"/></svg>
      </span>
      <input type="text" (input)="onSearch($event)" placeholder="Référence BL, OR, client ou immatriculation..."
        class="w-full pl-9 pr-4 py-2 rounded-lg border border-oas-line bg-oas-bg text-sm focus:outline-none focus:ring-2 focus:ring-oas-accent/40 focus:border-oas-accent transition" />
    </div>
  </div>

  <div class="bg-white rounded-lg border border-oas-line shadow-card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead><tr class="border-b border-oas-line bg-oas-bg/40">
          <th class="text-left text-xs font-bold text-oas-muted px-5 py-3">Référence</th>
          <th class="text-left text-xs font-bold text-oas-muted px-5 py-3">Date</th>
          <th class="text-left text-xs font-bold text-oas-muted px-5 py-3">Client</th>
          <th class="text-left text-xs font-bold text-oas-muted px-5 py-3">Véhicule</th>
          <th class="text-left text-xs font-bold text-oas-muted px-5 py-3">Ordre de réparation</th>
          <th class="text-left text-xs font-bold text-oas-muted px-5 py-3">Bons de sortie</th>
          <th class="text-right text-xs font-bold text-oas-muted px-5 py-3">Total TTC</th>
          <th class="text-right text-xs font-bold text-oas-muted px-5 py-3">Actions</th>
        </tr></thead>
        <tbody>
          @if (loading) {
            <tr><td colspan="8" class="text-center py-14 text-oas-muted">
              <svg class="animate-spin h-5 w-5 mx-auto mb-2 text-oas-accent" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Chargement...
            </td></tr>
          } @else {
            @for (bon of bons; track bon.id) {
              <tr class="hover:bg-oas-bg transition border-b border-oas-line">
                <td class="px-5 py-4"><span class="font-mono font-bold text-oas-accent text-xs">{{ bon.numero }}</span></td>
                <td class="px-5 py-4 text-xs text-oas-muted whitespace-nowrap">{{ bon.dateCreation | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="px-5 py-4"><span class="font-semibold text-oas-ink text-xs">{{ bon.clientNom }}</span></td>
                <td class="px-5 py-4 text-xs font-mono font-semibold text-oas-ink2">{{ bon.immatriculation }}</td>
                <td class="px-5 py-4"><span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">{{ bon.ordreReparationNumero }}</span></td>
                <td class="px-5 py-4 text-xs text-oas-ink2">{{ (bon.bonsDeSortieReferences || []).join(', ') || '—' }}</td>
                <td class="px-5 py-4 text-right font-bold text-xs whitespace-nowrap">{{ bon.montantTTC | number:'1.0-0' }} FCFA</td>
                <td class="px-5 py-4"><div class="flex items-center justify-end gap-1">
                  <button type="button" (click)="openDetail(bon)" title="Voir le détail" class="p-1.5 rounded-lg hover:bg-oas-info-bg text-oas-muted hover:text-oas-info transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="m20 20-4-4"/></svg>
                  </button>
                  <button type="button" (click)="print(bon)" title="Imprimer" class="p-1.5 rounded-lg hover:bg-oas-bg text-oas-muted hover:text-oas-ink transition cursor-pointer">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2m-12-4h12v8H6z"/></svg>
                  </button>
                </div></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="text-center py-14 text-oas-muted text-sm">Aucun bon de livraison</td></tr>
            }
          }
        </tbody>
      </table>
    </div>
    @if (totalElements > 0) {
      <app-pagination [page]="page" [totalPages]="totalPages" [total]="totalElements" [pageSize]="pageSize"
        (prev)="prevPage()" (next)="nextPage()" />
    }
  </div>
</div>

@if (showCreateModal) {
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeCreate()">
    <div class="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col min-h-[460px]" (click)="$event.stopPropagation()">
      <div class="px-6 py-4 border-b border-oas-line flex-shrink-0">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-oas-ink">Nouveau bon de livraison</h3>
          <button type="button" (click)="closeCreate()" class="p-1 rounded-lg hover:bg-oas-bg text-oas-muted cursor-pointer" aria-label="Fermer">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="m18 6-12 12M6 6l12 12"/></svg>
          </button>
        </div>
        <p class="text-xs text-oas-muted">Sélectionnez l’ordre de réparation et les bons de sortie validés à livrer.</p>
      </div>
      <div class="flex-1 px-6 py-5 min-h-[380px] overflow-y-auto space-y-4">
        @if (modalError) { <div class="px-3 py-2 bg-oas-bad-bg border border-oas-bad/30 text-oas-bad text-xs rounded-lg">{{ modalError }}</div> }
        <div>
          <label class="block text-sm font-semibold text-oas-ink mb-1">Ordre de réparation <span class="text-oas-bad">*</span></label>
          <app-searchable-select [options]="ordres" bindValue="id" [bindLabel]="formatOrdre"
            [(ngModel)]="ordreId" (ngModelChange)="onOrderChange($event)" [allowClear]="true"
            placeholder="Rechercher un ordre de réparation..." [disabled]="loadingOrdres" />
        </div>
        @if (ordreId) {
          <div class="bg-oas-bg/60 border border-oas-line rounded-xl p-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div><p class="text-[11px] font-bold uppercase tracking-wider text-oas-muted">Bons de sortie validés de l’OR</p>
                <p class="text-sm font-bold text-oas-ink mt-1">{{ selectedOrdreLabel }}</p></div>
              <span class="text-xs font-bold text-oas-accent">{{ selectedBs.size }} sélectionné(s)</span>
            </div>
          </div>
          @if (loadingBs) {
            <div class="text-center py-8 text-oas-muted text-sm"><svg class="animate-spin h-5 w-5 mx-auto mb-2 text-oas-accent" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="11" cy="11" r="7" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 11a7 7 0 017-7v7H4z"/></svg>Chargement des bons de sortie...</div>
          } @else if (bonsSortie.length) {
            <div class="border border-oas-line rounded-xl overflow-hidden">
              <div class="px-4 py-2.5 bg-oas-bg/50 border-b border-oas-line text-xs font-bold text-oas-muted">Bons disponibles</div>
              @for (bs of bonsSortie; track bs.id) {
                <label class="flex items-center gap-3 px-4 py-3 border-b border-oas-line last:border-0 hover:bg-oas-bg/60 cursor-pointer">
                  <input type="checkbox" [checked]="selectedBs.has(bs.id)" (change)="toggleBs(bs.id, $event)" class="accent-oas-accent w-4 h-4">
                  <span class="flex-1 min-w-0"><span class="font-mono font-bold text-oas-accent text-xs">{{ bs.reference }}</span><span class="text-oas-muted text-xs ml-2">{{ bs.date | date:'dd/MM/yyyy' }}</span></span>
                  <span class="font-semibold text-oas-ink text-xs whitespace-nowrap">{{ bs.montant | number:'1.0-0' }} FCFA</span>
                </label>
              }
            </div>
          } @else {
            <div class="px-4 py-3 bg-oas-warn-bg border border-oas-warn/30 text-oas-warn text-xs rounded-lg">Aucun bon de sortie validé n’est lié à cet OR.</div>
          }
        }
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="block text-sm font-semibold text-oas-ink mb-1">Remarque</label><input type="text" [(ngModel)]="remarque" maxlength="500" placeholder="Optionnel..." class="w-full px-3 py-2.5 rounded-lg border border-oas-line bg-oas-bg text-sm focus:outline-none focus:ring-2 focus:ring-oas-accent/40 transition"></div>
          <label class="flex items-center gap-2 text-sm text-oas-ink self-end pb-2"><input type="checkbox" [(ngModel)]="appliquerTVA" class="accent-oas-accent w-4 h-4"> Appliquer la TVA</label>
        </div>
      </div>
      <div class="px-6 py-4 border-t border-oas-line flex-shrink-0 flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          @if (modalError) {
            <div class="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold max-w-full">
              <span class="truncate" [title]="modalError">{{ modalError }}</span>
            </div>
          }
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" (click)="closeCreate()" class="bg-white hover:bg-oas-bg text-oas-ink font-semibold px-4 h-10 rounded-lg border border-oas-line transition cursor-pointer text-sm">Annuler</button>
          <button type="button" (click)="create()" [disabled]="saving || !ordreId || !selectedBs.size" class="bg-oas-accent hover:bg-oas-accent-dark text-white font-bold px-5 h-10 rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm">{{ saving ? 'Création...' : 'Créer le bon' }}</button>
        </div>
      </div>
    </div>
  </div>
}

@if (showDetailModal && selectedBon) {
  <div class="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4" (click)="closeDetail()">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-oas-line" (click)="$event.stopPropagation()">
      <div class="flex items-center justify-between px-6 py-4 border-b border-oas-line bg-oas-bg/50 flex-shrink-0">
        <div class="flex items-center gap-3.5"><div class="w-11 h-11 rounded-xl bg-oas-accent text-white flex items-center justify-center font-mono font-black text-sm shadow-sm">BL</div>
          <div><h3 class="font-black text-lg text-oas-ink font-mono tracking-tight">{{ selectedBon.numero }}</h3><p class="text-xs text-oas-muted mt-0.5">Émis le {{ selectedBon.dateCreation | date:'dd/MM/yyyy HH:mm' }}</p></div></div>
        <button type="button" (click)="closeDetail()" class="p-2 rounded-xl hover:bg-white text-oas-muted hover:text-oas-ink border border-transparent hover:border-oas-line cursor-pointer transition"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="m18 6-12 12M6 6l12 12"/></svg></button>
      </div>
      <div class="overflow-y-auto flex-1 px-6 py-5 space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="bg-oas-bg/60 border border-oas-line/80 rounded-xl p-4 space-y-1.5"><p class="text-[11px] font-bold uppercase tracking-wider text-oas-muted">Client</p><p class="font-bold text-oas-ink text-sm">{{ selectedBon.clientNom }}</p></div>
          <div class="bg-oas-bg/60 border border-oas-line/80 rounded-xl p-4 space-y-1.5"><p class="text-[11px] font-bold uppercase tracking-wider text-oas-muted">Véhicule</p><p class="font-mono font-bold text-xs text-oas-ink">{{ selectedBon.immatriculation }}</p></div>
          <div class="bg-oas-bg/60 border border-oas-line/80 rounded-xl p-4 space-y-1.5"><p class="text-[11px] font-bold uppercase tracking-wider text-oas-muted">Ordre de réparation</p><p class="font-bold text-purple-700 text-sm">{{ selectedBon.ordreReparationNumero }}</p></div>
          <div class="bg-oas-bg/60 border border-oas-line/80 rounded-xl p-4 space-y-1.5"><p class="text-[11px] font-bold uppercase tracking-wider text-oas-muted">TVA</p><p class="font-semibold text-sm">{{ selectedBon.tvaApplicable ? 'Activée' : 'Désactivée' }}</p></div>
        </div>
        @if (selectedBon.remarque) { <div class="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-950"><span class="font-bold uppercase tracking-wide text-[10px] block">Remarque</span><p class="mt-1">{{ selectedBon.remarque }}</p></div> }
        <div class="space-y-2.5"><div class="flex items-center justify-between"><h4 class="text-sm font-bold text-oas-ink">Bons de sortie liés</h4><span class="text-xs font-black text-oas-accent bg-oas-bg px-3 py-1 rounded-lg border border-oas-line">{{ selectedBon.bonsDeSortieReferences.length }} bon(s)</span></div>
          <div class="border border-oas-line rounded-xl divide-y divide-oas-line">@for (ref of selectedBon.bonsDeSortieReferences; track ref) { <div class="px-4 py-3 font-mono text-xs font-bold text-oas-accent">{{ ref }}</div> }</div>
        </div>
        <div class="bg-oas-bg/70 border border-oas-line rounded-xl p-4 space-y-2 text-sm"><div class="flex justify-between"><span class="text-oas-muted">Total HT</span><strong>{{ selectedBon.montantHT | number:'1.0-0' }} FCFA</strong></div><div class="flex justify-between"><span class="text-oas-muted">TVA</span><strong>{{ selectedBon.montantTVA | number:'1.0-0' }} FCFA</strong></div><div class="flex justify-between border-t border-oas-line pt-2 text-base"><span class="font-bold">Total TTC</span><strong class="text-oas-accent">{{ selectedBon.montantTTC | number:'1.0-0' }} FCFA</strong></div></div>
        @if (errorMessage) { <div class="px-3 py-2 bg-oas-bad-bg border border-oas-bad/30 text-oas-bad text-xs rounded-lg">{{ errorMessage }}</div> }
      </div>
      <div class="px-6 py-4 border-t border-oas-line flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div class="flex gap-2"><button type="button" (click)="convertNote(selectedBon)" [disabled]="!!selectedBon.noteDePrixNumero || actionLoading" class="px-3 py-2 rounded-lg border border-oas-line text-oas-ink text-xs font-semibold hover:bg-oas-bg disabled:opacity-50 cursor-pointer">{{ selectedBon.noteDePrixNumero ? 'Note ' + selectedBon.noteDePrixNumero : 'Convertir en note de prix' }}</button><button type="button" (click)="convertFacture(selectedBon)" [disabled]="!!selectedBon.factureNumero || actionLoading" class="px-3 py-2 rounded-lg bg-oas-ok text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer">{{ selectedBon.factureNumero ? 'Facture ' + selectedBon.factureNumero : 'Créer la facture' }}</button></div>
        <button type="button" (click)="print(selectedBon)" class="px-3 py-2 rounded-lg bg-oas-accent hover:bg-oas-accent-dark text-white text-xs font-bold cursor-pointer">Imprimer</button>
      </div>
    </div>
  </div>
}`
})
export class BonsLivraisonComponent extends BasePaginatedComponent implements OnInit {
  private api = inject(BonDeLivraisonService);
  private orApi = inject(OrdreReparationService);
  private route = inject(ActivatedRoute);
  bons: BonDeLivraison[] = [];
  ordres: any[] = [];
  bonsSortie: BonDeSortieDisponible[] = [];
  ordreId: number | null = null;
  selectedBs = new Set<number>();
  selectedBon: BonDeLivraison | null = null;
  remarque = '';
  appliquerTVA = true;
  loading = false;
  loadingOrdres = false;
  loadingBs = false;
  saving = false;
  actionLoading = false;
  showCreateModal = false;
  showDetailModal = false;
  successMessage = '';
  errorMessage = '';
  modalError = '';

  ngOnInit(): void {
    this.loadingOrdres = true;
    this.orApi.getAll({ page: 0, size: 100 }).subscribe({
      next: data => { this.ordres = data?.content ?? data?.data ?? data ?? []; this.loadingOrdres = false; },
      error: () => { this.loadingOrdres = false; }
    });
    this.loadData();
    const ordreId = Number(this.route.snapshot.queryParamMap.get('ordreId'));
    if (ordreId > 0) this.openCreate(ordreId);
  }

  loadData(): void {
    this.loading = true;
    this.api.list({ page: this.page - 1, size: this.pageSize, keyword: this.searchTerm || undefined }).subscribe({
      next: response => { this.bons = this.applyPageResponse<BonDeLivraison>(response); this.loading = false; },
      error: err => { this.errorMessage = err?.error?.message || 'Impossible de charger les bons de livraison.'; this.loading = false; }
    });
  }

  formatOrdre = (ordre: any): string => `${ordre.numero || 'OR'} · ${ordre.vehicule?.immatriculation || ordre.vehiculeImmatriculation || 'Véhicule'}`;
  get selectedOrdreLabel(): string { return this.ordres.find(o => Number(o.id) === Number(this.ordreId)) ? this.formatOrdre(this.ordres.find(o => Number(o.id) === Number(this.ordreId))) : `OR #${this.ordreId}`; }

  openCreate(ordreId?: number): void {
    this.ordreId = ordreId ?? null; this.selectedBs.clear(); this.bonsSortie = [];
    this.remarque = ''; this.appliquerTVA = true; this.modalError = ''; this.showCreateModal = true;
    if (this.ordreId) this.onOrderChange(this.ordreId);
  }
  closeCreate(): void { if (this.saving) return; this.showCreateModal = false; this.modalError = ''; }
  onOrderChange(id: number | null): void {
    this.ordreId = id; this.selectedBs.clear(); this.bonsSortie = []; this.modalError = '';
    if (!id) return;
    this.loadingBs = true;
    this.api.getBonsDeSortie(id).subscribe({
      next: result => { this.bonsSortie = result; this.loadingBs = false; },
      error: err => { this.modalError = err?.error?.message || 'Impossible de charger les bons de sortie.'; this.loadingBs = false; }
    });
  }
  toggleBs(id: number, event: Event): void {
    if ((event.target as HTMLInputElement).checked) this.selectedBs.add(id); else this.selectedBs.delete(id);
  }
  create(): void {
    if (!this.ordreId || !this.selectedBs.size || this.saving) return;
    this.saving = true; this.modalError = '';
    this.api.create({ ordreReparationId: this.ordreId, bonsDeSortieIds: [...this.selectedBs], appliquerTVA: this.appliquerTVA, remarque: this.remarque || undefined }).subscribe({
      next: () => { this.saving = false; this.showCreateModal = false; this.successMessage = 'Bon de livraison créé.'; this.page = 1; this.loadData(); },
      error: err => { this.saving = false; this.modalError = err?.error?.message || 'La création du bon de livraison a échoué.'; }
    });
  }
  openDetail(bon: BonDeLivraison): void { this.selectedBon = bon; this.errorMessage = ''; this.showDetailModal = true; }
  closeDetail(): void { this.showDetailModal = false; this.selectedBon = null; this.errorMessage = ''; }
  convertFacture(bon: BonDeLivraison): void {
    if (this.actionLoading) return; this.actionLoading = true; this.errorMessage = '';
    this.api.convertirFacture(bon.id).subscribe({ next: result => this.afterAction('Facture créée depuis le bon de livraison.', { factureId: result?.id, factureNumero: result?.numero }), error: err => { this.actionLoading = false; this.errorMessage = err?.error?.message || 'La conversion en facture a échoué.'; } });
  }
  convertNote(bon: BonDeLivraison): void {
    if (this.actionLoading) return; this.actionLoading = true; this.errorMessage = '';
    this.api.convertirNote(bon.id).subscribe({ next: result => this.afterAction('Note de prix créée depuis le bon de livraison.', { noteDePrixId: result?.id, noteDePrixNumero: result?.numero }), error: err => { this.actionLoading = false; this.errorMessage = err?.error?.message || 'La conversion en note de prix a échoué.'; } });
  }
  private afterAction(message: string, update: Partial<BonDeLivraison>): void {
    this.actionLoading = false; this.successMessage = message; this.loadData();
    if (this.selectedBon) this.selectedBon = { ...this.selectedBon, ...update };
  }
  print(bon: BonDeLivraison): void {
    this.api.pdf(bon.id).subscribe({ next: blob => {
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `${bon.numero}.pdf`; link.click(); URL.revokeObjectURL(url);
    }, error: () => this.errorMessage = 'Le PDF du bon de livraison ne peut pas être généré.' });
  }
}
