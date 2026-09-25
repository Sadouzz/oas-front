import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, NgClass, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrdreReparationService } from './ordre-reparation.service';
import { ProformaService } from '../proforma/proforma.service';
import { FactureService } from '../factures/facture.service';
import { PieceDetacheeService } from '../pieces-detachees/piece-detachee.service';
import { MainDoeuvreService } from '../main-doeuvre/main-doeuvre.service';
import { DevisPrevisionnelService } from '../devis-previsionnels/devis-previsionnel.service';
import { DevisPrevisionnelRequest } from '../devis-previsionnels/models/devis-previsionnel.model';
import { VehiculeService } from '../vehicules/vehicule.service';
import { ClientService } from '../clients/client.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import {
  OrdreReparation,
  StatutOrdre,
  getEtapeFromStatut,
  PieceDetache,
  MainDoeuvreModel,
  extractContent
} from '../../shared/models';

export const STATUT_STEPS: { statut: StatutOrdre; label: string }[] = [
  { statut: 'RECEPTION', label: 'Réception' },
  { statut: 'DIAGNOSTIC', label: 'Diagnostic' },
  { statut: 'PIECES_MO', label: 'Pièces & MO' },
  { statut: 'PROFORMA', label: 'Proforma' },
  { statut: 'BON_DE_COMMANDE', label: 'Approv.' },
  { statut: 'BON_DE_SORTIE', label: 'Attente BS' },
  { statut: 'ASSIGN_TECHNICIEN', label: 'Assign. Tech.' },
  { statut: 'REPARATION', label: 'Réparation' },
  { statut: 'PAIEMENT', label: 'Paiement' },
  { statut: 'PRET_A_LIVRER', label: 'Prêt' },
  { statut: 'LIVRE', label: 'Livré' },
];

@Component({
  selector: 'app-ordres-reparation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgClass,
    NgStyle,
    RouterLink,
    AlertComponent,
    PaginationComponent
  ],
  templateUrl: './ordres-reparation.component.html',
})
export class OrdresReparationComponent extends BasePaginatedComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private service = inject(OrdreReparationService);
  private proformaService = inject(ProformaService);
  private factureService = inject(FactureService);
  private pieceService = inject(PieceDetacheeService);
  private moService = inject(MainDoeuvreService);
  private devisPrevisionnelService = inject(DevisPrevisionnelService);
  private vehiculeService = inject(VehiculeService);
  private clientService = inject(ClientService);

  allPieces: PieceDetache[] = [];
  allMO: MainDoeuvreModel[] = [];

  // ─── Modal Devis Prévisionnel ─────────────────────────
  showDevisModal = false;
  selectedOrdreForDevis: OrdreReparation | null = null;
  devisMontant: number | null = null;
  devisKilometrage: number | null = null;
  devisNotes = '';
  creatingDevis = false;
  devisModalError = '';

  // ─── Liste & Filtres ──────────────────────────────────
  rawOrdres: OrdreReparation[] = [];
  filteredOrdres: OrdreReparation[] = [];
  ordres: OrdreReparation[] = [];
  loading = false;
  successMessage = '';
  errorMessage = '';
  showWorkflow = false;

  filterStatut: string = '';
  filterDateDebut: string = '';
  filterDateFin: string = '';
  private searchTimeout: any;

  // ─── Tiroir de détail ─────────────────────────────────
  selectedOrdre: OrdreReparation | null = null;
  detailLoading = false;
  selectedOrdreProforma: any = null;
  selectedOrdreInvoice: any = null;
  invoiceCreated = false;

  readonly statutSteps = STATUT_STEPS;

  ngOnInit(): void {
    this.pieceService.getAll().subscribe({
      next: res => { this.allPieces = extractContent<PieceDetache>(res as any); this.cdr.markForCheck(); },
      error: () => {}
    });
    this.moService.getAll().subscribe({
      next: res => { this.allMO = extractContent<MainDoeuvreModel>(res as any); this.cdr.markForCheck(); },
      error: () => {}
    });

    const qp = this.route.snapshot.queryParams;
    if (qp) {
      if (qp['ficheAtelierId']) {
        const fId = +qp['ficheAtelierId'];
        this.service.createFromFicheAtelier(fId).subscribe({
          next: (ordre) => {
            const target = this.statutToStepPath(ordre.statut);
            this.router.navigate(['/app/ordres-reparation', ordre.id, target], { replaceUrl: true });
          },
          error: () => {
            this.loadData();
          }
        });
        return;
      }
      if (qp['statut']) {
        this.filterStatut = qp['statut'];
      }
      if (qp['keyword'] || qp['search']) {
        this.searchTerm = qp['keyword'] || qp['search'];
      }
    }
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  override loadData(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const extra: Record<string, any> = {};
    if (this.filterStatut) {
      extra['statut'] = this.filterStatut;
      extra['status'] = this.filterStatut;
    }
    if (this.filterDateDebut) {
      extra['dateDebut'] = this.filterDateDebut;
      extra['startDate'] = this.filterDateDebut;
    }
    if (this.filterDateFin) {
      extra['dateFin'] = this.filterDateFin;
      extra['endDate'] = this.filterDateFin;
    }
    if (this.searchTerm && this.searchTerm.trim()) {
      extra['keyword'] = this.searchTerm.trim();
      extra['search'] = this.searchTerm.trim();
      extra['q'] = this.searchTerm.trim();
    }

    const params = {
      page: 0,
      size: 1000,
      ...extra
    };

    this.service.getAll(params).subscribe({
      next: (res: any) => {
        const items = extractContent<OrdreReparation>(res);
        this.rawOrdres = (items && items.length) ? items : (this.applyPageResponse<OrdreReparation>(res) || []);
        this.rawOrdres.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

        this.applyFilter();

        this.loading = false;
        this.cdr.markForCheck();

        if (this.selectedOrdre) {
          const found = this.rawOrdres.find(o => o.id === this.selectedOrdre?.id);
          if (found) {
            this.selectedOrdre = found;
          }
        }
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.notifyError('Erreur de chargement des ordres de réparation');
      }
    });
  }

  get paged(): OrdreReparation[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredOrdres.slice(start, start + this.pageSize);
  }

  override get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalElements / this.pageSize));
  }

  override prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.cdr.markForCheck();
    }
  }

  override nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.cdr.markForCheck();
    }
  }

  override goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages && p !== this.page) {
      this.page = p;
      this.cdr.markForCheck();
    }
  }

  // ─── Actions Navigation ───────────────────────────────
  openNew(): void {
    this.router.navigate(['/app/ordres-reparation/nouveau']);
  }

  statutToStepPath(statut?: string | null): string {
    switch (statut) {
      case 'RECEPTION':
      case 'A_FAIRE': return 'reception';
      case 'DIAGNOSTIC':
      case 'EN_DIAGNOSTIC': return 'diagnostic';
      case 'PIECES_MO':
      case 'EN_ATTENTE_PIECES_MO': return 'pieces-mo';
      case 'PROFORMA':
      case 'EN_ATTENTE_PROFORMA': return 'proforma';
      case 'BON_DE_COMMANDE':
      case 'PROFORMA_VALIDE':
      case 'EN_ATTENTE_COMMANDE': return 'approvisionnement';
      case 'BON_DE_SORTIE':
      case 'EN_ATTENTE_SORTIE': return 'bon-sortie';
      case 'ASSIGN_TECHNICIEN':
      case 'EN_ATTENTE_MECANICIEN': return 'assignation';
      case 'REPARATION':
      case 'EN_COURS': return 'reparation';
      case 'PAIEMENT':
      case 'EN_ATTENTE_PAIEMENT': return 'paiement';
      case 'PRET_A_LIVRER':
      case 'TERMINE': return 'livraison';
      case 'LIVRE': return 'cloture';
      default: return 'reception';
    }
  }

  openEdit(o: OrdreReparation): void {
    const target = this.statutToStepPath(o.statut);
    this.router.navigate(['/app/ordres-reparation', o.id, target]);
  }

  selectOrdre(o: OrdreReparation): void {
    if (this.selectedOrdre && this.selectedOrdre.id === o.id) {
      this.selectedOrdre = null;
      this.detailLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.selectedOrdre = o;
    this.detailLoading = true;
    this.selectedOrdreProforma = null;
    this.selectedOrdreInvoice = null;
    this.invoiceCreated = false;
    this.cdr.markForCheck();

    this.service.getById(o.id).subscribe({
      next: (fullOrdre: OrdreReparation) => {
        this.selectedOrdre = fullOrdre;
        this.detailLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.detailLoading = false;
        this.cdr.markForCheck();
      }
    });

    try {
      this.proformaService.getByOrdreReparationId(o.id).subscribe({
        next: (p) => { this.selectedOrdreProforma = p; this.cdr.markForCheck(); },
        error: () => { this.selectedOrdreProforma = null; this.cdr.markForCheck(); }
      });
    } catch (e) {}

    try {
      this.factureService.getAll().subscribe({
        next: (list: any[]) => {
          if (list && list.length) {
            const inv = list.find(it =>
              (it.ordreReparationId && Number(it.ordreReparationId) === Number(o.id)) ||
              (it.ordreReparation && Number(it.ordreReparation.id) === Number(o.id))
            );
            if (inv) {
              this.selectedOrdreInvoice = inv;
              this.invoiceCreated = true;
              this.cdr.markForCheck();
            }
          }
        },
        error: () => {}
      });
    } catch (e) {}
  }

  closeDetail(): void {
    this.selectedOrdre = null;
    this.selectedOrdreProforma = null;
    this.selectedOrdreInvoice = null;
    this.cdr.markForCheck();
  }

  delete(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet ordre de réparation ?')) return;
    this.service.delete(id).subscribe({
      next: () => {
        this.notify('Ordre de réparation supprimé.');
        if (this.selectedOrdre?.id === id) {
          this.selectedOrdre = null;
        }
        this.loadData();
      },
      error: () => this.notifyError('Erreur lors de la suppression.')
    });
  }

  createFactureFromOrdre(): void {
    if (!this.selectedOrdre) return;
    this.openEdit(this.selectedOrdre);
  }

  // ─── Filtres & Recherche (recherche directe en base de données) ──────────────────
  applyFilter(): void {
    let list = [...this.rawOrdres];

    // 1. Filtrage statut (supporte les étapes et les alias stockés en base)
    if (this.filterStatut) {
      list = list.filter(o => this.matchesStatut(o.statut, this.filterStatut));
    }

    // 2. Recherche textuelle (numéro, véhicule, client, défauts, description, libellé statut)
    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter(o => {
        const num = (o.numero || '').toLowerCase();
        const immat = (o.vehicule?.immatriculation || '').toLowerCase();
        const marque = (o.vehicule?.marque || '').toLowerCase();
        const modele = (o.vehicule?.modele || '').toLowerCase();
        const clientFirst = (o.vehicule?.client?.firstName || '').toLowerCase();
        const clientLast = (o.vehicule?.client?.lastName || '').toLowerCase();
        const clientFullName = `${clientFirst} ${clientLast}`.trim();
        const clientPhone = (o.vehicule?.client?.phone || '').toLowerCase();
        const desc = (o.descriptionTravaux || '').toLowerCase();
        const defauts = (o.listeDefauts || '').toLowerCase();
        const label = this.statutLabel(o).toLowerCase();
        const rawStatut = (o.statut || '').toLowerCase();

        return (
          num.includes(q) ||
          immat.includes(q) ||
          marque.includes(q) ||
          modele.includes(q) ||
          clientFullName.includes(q) ||
          clientFirst.includes(q) ||
          clientLast.includes(q) ||
          clientPhone.includes(q) ||
          desc.includes(q) ||
          defauts.includes(q) ||
          label.includes(q) ||
          rawStatut.includes(q)
        );
      });
    }

    // 3. Date début
    if (this.filterDateDebut) {
      list = list.filter(o => {
        const d = this.getDateString(o.dateCreation || (o as any).createdAt || (o as any).dateOuverture);
        return d ? d >= this.filterDateDebut : false;
      });
    }

    // 4. Date fin
    if (this.filterDateFin) {
      list = list.filter(o => {
        const d = this.getDateString(o.dateCreation || (o as any).createdAt || (o as any).dateOuverture);
        return d ? d <= this.filterDateFin : false;
      });
    }

    this.filteredOrdres = list;
    this.ordres = list;
    this.totalElements = list.length;
    this.serverTotalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));

    if (this.page > this.serverTotalPages) {
      this.page = 1;
    }
  }

  matchesStatut(statut: string | undefined | null, filter: string): boolean {
    if (!filter) return true;
    if (!statut) return false;
    if (statut === filter) return true;

    const aliases: Record<string, string[]> = {
      RECEPTION: ['RECEPTION', 'A_FAIRE'],
      DIAGNOSTIC: ['DIAGNOSTIC', 'EN_DIAGNOSTIC'],
      PIECES_MO: ['PIECES_MO', 'EN_ATTENTE_PIECES_MO'],
      PROFORMA: ['PROFORMA', 'EN_ATTENTE_PROFORMA'],
      BON_DE_COMMANDE: ['BON_DE_COMMANDE', 'PROFORMA_VALIDE', 'EN_ATTENTE_COMMANDE'],
      BON_DE_SORTIE: ['BON_DE_SORTIE', 'EN_ATTENTE_SORTIE'],
      ASSIGN_TECHNICIEN: ['ASSIGN_TECHNICIEN', 'EN_ATTENTE_MECANICIEN'],
      REPARATION: ['REPARATION', 'EN_COURS'],
      PAIEMENT: ['PAIEMENT', 'EN_ATTENTE_PAIEMENT'],
      PRET_A_LIVRER: ['PRET_A_LIVRER', 'TERMINE'],
      LIVRE: ['LIVRE']
    };

    const group = aliases[filter];
    if (group) {
      return group.includes(statut);
    }
    return statut.toUpperCase() === filter.toUpperCase();
  }

  onFilterStatut(): void {
    this.page = 1;
    this.loadData();
  }

  onFilterDate(): void {
    this.page = 1;
    this.loadData();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm = value;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.loadData();
    }, 350);
  }

  override onSearch(event: Event): void {
    this.onSearchInput(event);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.page = 1;
    this.loadData();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterStatut = '';
    this.filterDateDebut = '';
    this.filterDateFin = '';
    this.page = 1;
    this.loadData();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm?.trim() || this.filterStatut || this.filterDateDebut || this.filterDateFin);
  }

  // ─── Helpers Visuels ──────────────────────────────────
  statutColor(o: OrdreReparation): string {
    switch (o?.statut) {
      case 'RECEPTION':
      case 'A_FAIRE': return '#ef4444';
      case 'DIAGNOSTIC':
      case 'EN_DIAGNOSTIC': return '#f59e0b';
      case 'PIECES_MO':
      case 'EN_ATTENTE_PIECES_MO': return '#8b5cf6';
      case 'PROFORMA':
      case 'EN_ATTENTE_PROFORMA': return '#6366f1';
      case 'BON_DE_COMMANDE':
      case 'PROFORMA_VALIDE':
      case 'EN_ATTENTE_COMMANDE': return '#ec4899';
      case 'BON_DE_SORTIE':
      case 'EN_ATTENTE_SORTIE': return '#6366f1';
      case 'ASSIGN_TECHNICIEN':
      case 'EN_ATTENTE_MECANICIEN': return '#06b6d4';
      case 'REPARATION':
      case 'EN_COURS': return '#3b82f6';
      case 'PAIEMENT':
      case 'EN_ATTENTE_PAIEMENT': return '#f97316';
      case 'PRET_A_LIVRER':
      case 'TERMINE': return '#10b981';
      case 'LIVRE': return '#059669';
      default: return '#6b7280';
    }
  }

  statutLabel(o: OrdreReparation): string {
    const step = STATUT_STEPS.find(s => s.statut === o?.statut);
    if (step) return step.label;
    if (o?.statut === 'A_FAIRE') return 'Réception';
    if (o?.statut === 'EN_DIAGNOSTIC') return 'Diagnostic';
    if (o?.statut === 'EN_ATTENTE_PIECES_MO') return 'Pièces & MO';
    if (o?.statut === 'EN_ATTENTE_PROFORMA') return 'Proforma';
    if (o?.statut === 'EN_ATTENTE_COMMANDE' || o?.statut === 'PROFORMA_VALIDE') return 'Approv.';
    if (o?.statut === 'EN_ATTENTE_SORTIE') return 'Attente BS';
    if (o?.statut === 'EN_ATTENTE_MECANICIEN') return 'Assign. Tech.';
    if (o?.statut === 'EN_COURS') return 'Réparation';
    if (o?.statut === 'EN_ATTENTE_PAIEMENT') return 'Paiement';
    if (o?.statut === 'TERMINE') return 'Prêt';
    return o?.statut ?? '—';
  }

  statutStepIndex(o: OrdreReparation): number {
    return getEtapeFromStatut(o?.statut) - 1;
  }

  ordreInitials(o: OrdreReparation): string {
    if (!o?.numero) return 'OR';
    const parts = o.numero.split('-');
    return parts.length >= 2 ? parts.slice(-2).join('') : o.numero.substring(0, 3).toUpperCase();
  }

  formatDate(d?: any): string {
    if (!d) return '—';
    try {
      const dateStr = this.getDateString(d);
      if (!dateStr) return '—';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return String(d);
    }
  }

  private getDateString(d: any): string {
    if (!d) return '';
    if (typeof d === 'string') return d.slice(0, 10);
    if (Array.isArray(d)) {
      const [year, month, day] = d;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    if (d instanceof Date && !isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return '';
  }

  formatPrice(p?: number | null): string {
    if (p == null) return '0 FCFA';
    return p.toLocaleString('fr-FR') + ' FCFA';
  }

  getLpPrice(lp: any): number {
    if (lp?.prix != null && Number(lp.prix) > 0) return Number(lp.prix);
    if (lp?.piece?.prix != null && Number(lp.piece.prix) > 0) return Number(lp.piece.prix);
    const cat = this.allPieces.find(p => p.id === (lp?.piece?.id || lp?.pieceId));
    return cat?.prix ? Number(cat.prix) : 0;
  }

  getLmPrice(lm: any): number {
    if (lm?.prix != null && Number(lm.prix) > 0) return Number(lm.prix);
    if (lm?.mainDoeuvre?.prix != null && Number(lm.mainDoeuvre.prix) > 0) return Number(lm.mainDoeuvre.prix);
    const cat = this.allMO.find(m => m.id === (lm?.mainDoeuvre?.id || lm?.mainDoeuvreId));
    return cat?.prix ? Number(cat.prix) : 0;
  }

  // ─── Modal Devis Prévisionnel ─────────────────────────
  openCreateDevis(f: OrdreReparation): void {
    this.selectedOrdreForDevis = f;
    this.devisModalError = '';
    this.devisNotes = f.descriptionTravaux || '';
    this.devisKilometrage = f.vehicule?.kilometrage ?? (f.diagnostic?.kilometrage ?? 0);

    // Calculer un montant suggéré basé sur les pièces & main d'œuvre actuelles si présentes
    let totalSuggere = 0;
    if (f.lignesOrdreReparationPieces?.length) {
      for (const lp of f.lignesOrdreReparationPieces) {
        const p = this.getLpPrice(lp);
        totalSuggere += p * (lp.quantite || 1);
      }
    }
    if (f.lignesOrdreReparationMainDoeuvres?.length) {
      for (const lm of f.lignesOrdreReparationMainDoeuvres) {
        const p = this.getLmPrice(lm);
        totalSuggere += p * (lm.nbreHeure || 1);
      }
    }
    this.devisMontant = totalSuggere > 0 ? totalSuggere : null;
    this.showDevisModal = true;
    this.cdr.markForCheck();

    // Charger l'ordre complet en arrière-plan pour disposer de toutes les relations et identifiants
    this.service.getById(f.id).subscribe({
      next: (fullOrdre) => {
        if (fullOrdre) {
          this.selectedOrdreForDevis = fullOrdre;
          if (this.devisKilometrage == null && fullOrdre.vehicule?.kilometrage != null) {
            this.devisKilometrage = fullOrdre.vehicule.kilometrage;
          }
          this.cdr.markForCheck();
        }
      },
      error: () => {}
    });
  }

  closeDevisModal(): void {
    this.showDevisModal = false;
    this.selectedOrdreForDevis = null;
    this.devisMontant = null;
    this.devisKilometrage = null;
    this.devisNotes = '';
    this.devisModalError = '';
    this.creatingDevis = false;
    this.cdr.markForCheck();
  }

  async saveDevisPrevisionnel(): Promise<void> {
    if (!this.selectedOrdreForDevis) return;
    let o = this.selectedOrdreForDevis;

    if (this.devisMontant == null || this.devisMontant <= 0) {
      this.devisModalError = "Veuillez saisir un montant estimé supérieur à 0 FCFA.";
      this.cdr.markForCheck();
      return;
    }

    this.creatingDevis = true;
    this.devisModalError = '';
    this.cdr.markForCheck();

    let vehiculeId: number = Number(
      o.vehicule?.id || (o as any).vehiculeId || (o.vehicule as any)?.vehiculeId || 0
    );
    let clientId: number = Number(
      o.vehicule?.client?.id ||
      (o.vehicule as any)?.clientId ||
      (o.vehicule?.client as any)?.userId ||
      (o.vehicule?.client as any)?.clientId ||
      (o as any).clientId ||
      0
    );

    // 1) Si vehiculeId ou clientId manque, charger l'ordre complet par getById
    if (!vehiculeId || !clientId) {
      try {
        const full = await firstValueFrom(this.service.getById(o.id));
        if (full) {
          o = full;
          this.selectedOrdreForDevis = full;
          vehiculeId = vehiculeId || Number(full.vehicule?.id || (full as any).vehiculeId || 0);
          clientId = clientId || Number(
            full.vehicule?.client?.id ||
            (full.vehicule as any)?.clientId ||
            (full.vehicule?.client as any)?.userId ||
            (full.vehicule?.client as any)?.clientId ||
            (full as any).clientId ||
            0
          );
        }
      } catch (e) {
        console.warn('Erreur chargement ordre complet', e);
      }
    }

    // 2) Si vehiculeId est présent mais clientId manque, charger le véhicule complet
    if (vehiculeId && !clientId) {
      try {
        const v = await firstValueFrom(this.vehiculeService.getById(vehiculeId));
        if (v) {
          clientId = Number(v.client?.id || (v as any).clientId || (v.client as any)?.userId || 0);
        }
      } catch (e) {
        console.warn('Erreur chargement véhicule', e);
      }
    }

    // 3) Si le clientId est toujours 0 mais qu'on a le prénom/nom du client, faire une correspondance avec la liste clients
    if (!clientId && (o.vehicule?.client?.firstName || o.vehicule?.client?.lastName)) {
      try {
        const clients = await firstValueFrom(this.clientService.getAll());
        if (clients && clients.length) {
          const fn = (o.vehicule?.client?.firstName || '').trim().toLowerCase();
          const ln = (o.vehicule?.client?.lastName || '').trim().toLowerCase();
          const found = clients.find(c =>
            (c.firstName?.trim().toLowerCase() === fn && c.lastName?.trim().toLowerCase() === ln) ||
            (c.firstName?.trim().toLowerCase() === ln && c.lastName?.trim().toLowerCase() === fn) ||
            (c.phone && o.vehicule?.client?.phone && c.phone.trim() === o.vehicule.client.phone.trim())
          );
          if (found) {
            clientId = found.id;
          }
        }
      } catch (e) {
        console.warn('Erreur correspondance client', e);
      }
    }

    // 4) Si le vehiculeId est toujours 0 mais qu'on a l'immatriculation, chercher dans la liste des véhicules
    if (!vehiculeId && o.vehicule?.immatriculation) {
      try {
        const immat = o.vehicule.immatriculation.trim().toLowerCase();
        const vRes = await firstValueFrom(this.vehiculeService.getAll({ size: 100 }));
        const vList = extractContent<any>(vRes);
        const foundV = vList.find((v: any) => v.immatriculation?.trim().toLowerCase() === immat);
        if (foundV) {
          vehiculeId = foundV.id;
          if (!clientId) {
            clientId = Number(foundV.client?.id || foundV.clientId || 0);
          }
        }
      } catch (e) {
        console.warn('Erreur correspondance véhicule', e);
      }
    }

    if (!vehiculeId || !clientId) {
      this.creatingDevis = false;
      this.devisModalError = "Le véhicule et le client doivent être associés à cet ordre pour générer un devis.";
      this.cdr.markForCheck();
      return;
    }

    const payload: DevisPrevisionnelRequest = {
      clientId,
      vehiculeId,
      notesReparation: this.devisNotes?.trim() || o.descriptionTravaux || `Devis prévisionnel pour l'ordre ${o.numero}`,
      montantTotal: Number(this.devisMontant),
      kilometrageVehicule: Number(this.devisKilometrage ?? o.vehicule?.kilometrage ?? 0),
      ordreReparationId: o.id
    };

    this.devisPrevisionnelService.create(payload).subscribe({
      next: (res) => {
        this.creatingDevis = false;
        this.closeDevisModal();
        this.notify(`Devis prévisionnel ${res.numero || ''} créé avec succès.`);
        this.loadData();
      },
      error: (err) => {
        this.creatingDevis = false;
        this.devisModalError = err.error?.message || "Erreur lors de la création du devis prévisionnel.";
        this.cdr.markForCheck();
      }
    });
  }

  allerAuProforma(ordreId: number): void {
    this.closeDevisModal();
    this.router.navigate(['/app/ordres-reparation', ordreId, 'proforma']);
  }

  private notify(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.markForCheck();
    }, 4000);
  }

  private notifyError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.markForCheck();
    }, 5000);
  }
}
