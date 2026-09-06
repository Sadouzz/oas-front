import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlerteService } from '../alerte.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideShoppingCart, LucideAlertTriangle, LucideAlertCircle, LucideLayers } from '@lucide/angular';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { AlerteStockResponse, TypeAlerte, extractContent } from '../../../shared/models';

type AlertTab = 'ALL' | 'RUPTURE' | 'STOCK_FAIBLE';

@Component({
  selector: 'app-seuil-alertes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideShoppingCart,
    PaginationComponent,
    SearchableSelectComponent
  ],
  templateUrl: './seuil-alertes.html'
})
export class SeuilAlertes implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private alerteService = inject(AlerteService);
  private authService = inject(AuthService);
  private router = inject(Router);

  alertes: AlerteStockResponse[] = [];
  loading = false;
  readonly Math = Math;

  activeTab: AlertTab = 'ALL';
  searchQuery = '';
  selectedCategorie = '';
  categoriesOptions: { id: string; nom: string }[] = [];

  page = 1;
  pageSize = 10;
  totalElements = 0;
  totalPages = 1;

  get canEdit(): boolean {
    const r = this.authService.getRole();
    return r === 'ROLE_SUPER_AGENT' || r === 'ROLE_MASTER' || r === 'ROLE_AGENT_MAGASIN';
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    const pageIndex = this.page - 1;

    let obs$;
    if (this.activeTab === 'RUPTURE') {
      obs$ = this.alerteService.getRuptures(pageIndex, this.pageSize);
    } else if (this.activeTab === 'STOCK_FAIBLE') {
      obs$ = this.alerteService.getStocksFaibles(pageIndex, this.pageSize);
    } else {
      obs$ = this.alerteService.getAlertes(pageIndex, this.pageSize);
    }

    obs$.subscribe({
      next: (res: any) => {
        this.alertes = extractContent<AlerteStockResponse>(res);
        if (res && typeof res === 'object') {
          this.totalElements = res.totalElements ?? this.alertes.length;
          this.totalPages = res.totalPages ?? Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        } else {
          this.totalElements = this.alertes.length;
          this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        }

        // Build categories filter options
        const categoriesSet = new Set<string>();
        this.alertes.forEach(a => {
          if (a.categorie) categoriesSet.add(a.categorie);
        });
        this.categoriesOptions = Array.from(categoriesSet)
          .sort()
          .map(cat => ({ id: cat, nom: cat }));

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.alertes = [];
        this.totalElements = 0;
        this.totalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  setTab(tab: AlertTab) {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.page = 1;
      this.load();
    }
  }

  get filteredAlertes(): AlerteStockResponse[] {
    let list = Array.isArray(this.alertes) ? this.alertes : [];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(a =>
        a.reference?.toLowerCase().includes(q) ||
        a.designation?.toLowerCase().includes(q) ||
        a.numeroDeSerie?.toLowerCase().includes(q) ||
        a.categorie?.toLowerCase().includes(q)
      );
    }

    if (this.selectedCategorie) {
      list = list.filter(a => a.categorie === this.selectedCategorie);
    }

    return list;
  }

  onSearch(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  onCategorieChange(catNom: string) {
    this.selectedCategorie = catNom || '';
  }

  onPageChange(newPage: number) {
    this.page = newPage;
    this.load();
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.load();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.load();
    }
  }

  commanderPiece(a: AlerteStockResponse) {
    this.router.navigate(['/app/bons-commande'], { queryParams: { pieceId: a.pieceId } });
  }
}
