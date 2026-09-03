import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PieceDetacheeService, PieceDetache } from '../piece-detachee.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideShoppingCart } from '@lucide/angular';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { extractContent } from '../../../shared/models';

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
  private service = inject(PieceDetacheeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  pieces: PieceDetache[] = [];
  loading = false;
  readonly Math = Math;
  searchQuery = '';
  filterDepot = '';
  depotsFilters: string[] = [];
  categoriesOptions: { id: string, nom: string }[] = [];
  selectedCategorie = '';

  page = 1;
  pageSize = 10;

  get canEdit(): boolean {
    const r = this.authService.getRole();
    return r === 'ROLE_SUPER_AGENT' || r === 'ROLE_MASTER' || r === 'ROLE_AGENT_MAGASIN';
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data: any) => {
        this.pieces = extractContent<PieceDetache>(data).sort((a: any, b: any) => b.id - a.id);
        
        // Extract depots list for filter buttons
        const alertPieces = this.pieces.filter(p =>
          p.type === 'PDP' &&
          p.seuilMinimum != null &&
          (p.qteReelle ?? 0) <= p.seuilMinimum
        );
        this.depotsFilters = [...new Set(alertPieces.map((p: any) => p.categorie?.depot?.nom).filter((d: any) => !!d))].sort() as string[];
        
        // Extract categories list for filter dropdown
        const categoriesMap = new Map<string, any>();
        alertPieces.forEach(p => {
          if (p.categorie && (p.categorie.nom || typeof p.categorie === 'string')) {
            const nom = p.categorie.nom || p.categorie;
            if (!categoriesMap.has(nom)) {
              categoriesMap.set(nom, p.categorie);
            }
          }
        });
        this.categoriesOptions = Array.from(categoriesMap.values()).map(c => {
          return typeof c === 'string' ? { id: c, nom: c } : { id: c.nom, nom: c.nom };
        }).sort((a, b) => a.nom.localeCompare(b.nom));

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLowStockPieces.length / this.pageSize) || 1;
  }

  get pagedLowStockPieces(): PieceDetache[] {
    return this.filteredLowStockPieces.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
  }

  prevPage() {
    if (this.page > 1) this.page--;
  }

  nextPage() {
    if (this.page < this.totalPages) this.page++;
  }

  get lowStockPieces(): PieceDetache[] {
    return this.pieces.filter(p =>
      p.type === 'PDP' &&
      p.seuilMinimum != null &&
      (p.qteReelle ?? 0) <= p.seuilMinimum
    );
  }

  get filteredLowStockPieces(): PieceDetache[] {
    let result = this.lowStockPieces;

    // Apply search query
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const catName = p.categorie?.nom || p.categorie || '';
        return (p.designation?.toLowerCase().includes(q) ||
          p.reference?.toLowerCase().includes(q) ||
          catName.toLowerCase().includes(q));
      });
    }

    // Apply depot filter
    if (this.filterDepot) {
      result = result.filter(p => p.categorie?.depot?.nom === this.filterDepot);
    }

    // Apply category filter
    if (this.selectedCategorie) {
      result = result.filter(p => {
        const catName = p.categorie?.nom || p.categorie || '';
        return catName === this.selectedCategorie;
      });
    }

    return result;
  }

  onSearch(event: Event) {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.page = 1;
  }

  setFilterDepot(depot: string) {
    this.filterDepot = this.filterDepot === depot ? '' : depot;
    this.page = 1;
  }

  onCategorieChange(catNom: string) {
    this.selectedCategorie = catNom || '';
    this.page = 1;
  }

  commanderPiece(p: PieceDetache) {
    this.router.navigate(['/agent/bons-commande'], { queryParams: { pieceId: p.id } });
  }
}
