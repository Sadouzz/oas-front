import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FicheAtelierService } from '../fiche-atelier.service';
import { RendezVousService } from '../../rendezvous/rendezvous.service';
import { OrdreReparationService } from '../../ordres-reparation/ordre-reparation.service';
import { AuthService } from '../../../core/services/auth.service';
import { FicheAtelierDetailsResponse, RendezVous, extractContent } from '../../../shared/models';
import { Router, RouterLink } from '@angular/router';
import { LucideEye, LucideWrench, LucidePlus, LucideX, LucideCalendar, LucideLock } from '@lucide/angular';
import { BasePaginatedComponent } from '../../../shared/components/base-paginated.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-fiches-atelier-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideEye, LucideWrench, LucidePlus, LucideX, LucideCalendar, LucideLock, PaginationComponent],
  templateUrl: './fiches-atelier-list.html'
})
export class FichesAtelierList extends BasePaginatedComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(FicheAtelierService);
  private rdvService = inject(RendezVousService);
  private ordreService = inject(OrdreReparationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  fiches: FicheAtelierDetailsResponse[] = [];
  loading = false;
  error = '';
  openingOrdreId: number | null = null;
  private searchTimeout: any;

  private readonly rolesAutorisesCreationOR = ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_CHEF_ATELIER'];
  get canCreateOrdreReparation(): boolean {
    const role = this.authService.getRole();
    return !!role && this.rolesAutorisesCreationOR.includes(role);
  }

  // Modal Nouveau Fiche Atelier (Sélection RDV)
  showNewModal = false;
  loadingRdv = false;
  rendezVousList: RendezVous[] = [];
  rdvSearch = '';

  ngOnInit(): void {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    const params = this.getPageParams();
    this.service.getAll(params).subscribe({
      next: (data) => {
        const arr = this.applyPageResponse<FicheAtelierDetailsResponse>(data);
        this.fiches = arr;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Erreur lors du chargement des fiches atelier.';
        this.fiches = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchInput(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.loadData();
    }, 300);
  }

  openNewFicheModal() {
    this.showNewModal = true;
    this.rdvSearch = '';
    this.loadRendezVous();
  }

  closeNewFicheModal() {
    this.showNewModal = false;
  }

  loadRendezVous() {
    this.loadingRdv = true;
    this.cdr.markForCheck();
    this.rdvService.getAll({ size: 100 }).subscribe({
      next: (data) => {
        this.rendezVousList = extractContent<RendezVous>(data).filter(r => 
          r.statut !== 'ANNULE' && r.statut !== 'REFUSE' && !r.hasFicheAtelier
        );
        this.loadingRdv = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.rendezVousList = [];
        this.loadingRdv = false;
        this.cdr.markForCheck();
      }
    });
  }

  get filteredRendezVous(): RendezVous[] {
    if (!this.rdvSearch?.trim()) return this.rendezVousList;
    const term = this.rdvSearch.toLowerCase().trim();
    return this.rendezVousList.filter(r =>
      (r.clientName && r.clientName.toLowerCase().includes(term)) ||
      (r.vehiculeImmatriculation && r.vehiculeImmatriculation.toLowerCase().includes(term)) ||
      (r.motif && r.motif.toLowerCase().includes(term)) ||
      (r.dateRendezVous && r.dateRendezVous.toLowerCase().includes(term))
    );
  }

  isRdvTodayOrPast(dateStr?: string | null): boolean {
    if (!dateStr) return false;
    const rdv = new Date(dateStr);
    const now = new Date();
    const rdvMidnight = new Date(rdv.getFullYear(), rdv.getMonth(), rdv.getDate()).getTime();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return todayMidnight >= rdvMidnight;
  }

  selectRendezVous(rdv: RendezVous) {
    if (!this.isRdvTodayOrPast(rdv.dateRendezVous)) {
      return;
    }
    this.showNewModal = false;
    this.router.navigate(['/app/admin/fiches-atelier/new', rdv.id]);
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
      case 'BL':
      case 'EN_ATTENTE_BL':
      case 'PAIEMENT':
      case 'EN_ATTENTE_PAIEMENT': return 'bl';
      case 'FACTURATION':
      case 'PRET_A_LIVRER':
      case 'TERMINE': return 'livraison';
      case 'LIVRE': return 'cloture';
      default: return 'reception';
    }
  }

  openOrdreTravail(fiche: FicheAtelierDetailsResponse) {
    this.openingOrdreId = fiche.id;
    this.cdr.markForCheck();

    this.ordreService.createFromFicheAtelier(fiche.id).subscribe({
      next: (res: any) => {
        const ordre = res?.data || res;
        this.openingOrdreId = null;
        this.cdr.markForCheck();
        if (ordre?.id) {
          const step = this.statutToStepPath(ordre.statut);
          this.router.navigate(['/app/ordres-reparation', ordre.id, step]);
        }
      },
      error: (err) => {
        // En cas d'erreur de création (ex: ordre déjà existant ou conflit), on recherche STRICTEMENT l'ordre lié à CETTE fiche
        this.ordreService.getAll({ size: 100 }).subscribe({
          next: (res: any) => {
            this.openingOrdreId = null;
            this.cdr.markForCheck();
            const list: any[] = extractContent<any>(res);
            const match = list.find(o => 
              Number(o.ficheAtelierId || o.ficheAtelier?.id) === Number(fiche.id)
            );
            if (match?.id) {
              const step = this.statutToStepPath(match.statut);
              this.router.navigate(['/app/ordres-reparation', match.id, step]);
            } else {
              const msg = err?.error?.message || err?.message || "Impossible d'ouvrir l'ordre de réparation pour cette fiche atelier.";
              alert(msg);
            }
          },
          error: () => {
            this.openingOrdreId = null;
            this.cdr.markForCheck();
            const msg = err?.error?.message || err?.message || "Impossible d'accéder à l'ordre de réparation.";
            alert(msg);
          }
        });
      }
    });
  }

  createWithoutRdv() {
    this.showNewModal = false;
    this.router.navigate(['/app/admin/fiches-atelier/new']);
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}
