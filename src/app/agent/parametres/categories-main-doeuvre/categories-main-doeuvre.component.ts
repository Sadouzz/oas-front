import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategorieMainDoeuvreService } from '../../main-doeuvre/categorie-main-doeuvre.service';
import { CategorieMainDoeuvreModel, CategorieMainDoeuvreRequest } from '../../../shared/models';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-categories-main-doeuvre',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './categories-main-doeuvre.component.html'
})
export class CategoriesMainDoeuvreComponent implements OnInit {
  private categorieService = inject(CategorieMainDoeuvreService);
  private cdr = inject(ChangeDetectorRef);

  categories: CategorieMainDoeuvreModel[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Pagination & Filter
  page = 1;
  pageSize = 10;
  totalElements = 0;
  totalPages = 1;
  search = '';

  newCategorie: CategorieMainDoeuvreRequest = { nom: '' };
  editingCategorie: CategorieMainDoeuvreModel | null = null;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.categorieService.getAll().subscribe({
      next: (res: any) => {
        const list: CategorieMainDoeuvreModel[] = Array.isArray(res)
          ? res
          : (res?.content || res?.data?.content || res?.data || []);

        let filtered = list;
        if (this.search?.trim()) {
          const term = this.search.trim().toLowerCase();
          filtered = list.filter((c) => c.nom && c.nom.toLowerCase().includes(term));
        }

        this.totalElements = filtered.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalElements / this.pageSize));
        this.categories = filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);

        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement catégories main d’œuvre', err);
        this.categories = [];
        this.totalElements = 0;
        this.totalPages = 1;
        this.isLoading = false;
        this.errorMessage = 'Impossible de charger les catégories de main d’œuvre.';
        this.cdr.markForCheck();
      }
    });
  }

  onSearchChange() {
    this.page = 1;
    this.loadData();
  }

  onPageChange(newPage: number) {
    this.page = newPage;
    this.loadData();
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadData();
    }
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadData();
    }
  }

  saveCategorie() {
    if (!this.newCategorie.nom?.trim()) return;
    this.categorieService.create({ nom: this.newCategorie.nom.trim() }).subscribe({
      next: () => {
        this.newCategorie = { nom: '' };
        this.showSuccess('Catégorie de main d’œuvre ajoutée avec succès.');
        this.loadData();
      },
      error: (err) => {
        console.error('Erreur création catégorie', err);
        this.errorMessage = err.error?.message || 'Erreur lors de la création de la catégorie.';
      }
    });
  }

  startEdit(cat: CategorieMainDoeuvreModel) {
    this.editingCategorie = { ...cat };
  }

  cancelEdit() {
    this.editingCategorie = null;
  }

  updateCategorie() {
    if (!this.editingCategorie || !this.editingCategorie.nom?.trim()) return;
    this.categorieService.update(this.editingCategorie.id, { nom: this.editingCategorie.nom.trim() }).subscribe({
      next: () => {
        this.editingCategorie = null;
        this.showSuccess('Catégorie mise à jour avec succès.');
        this.loadData();
      },
      error: (err) => {
        console.error('Erreur mise à jour catégorie', err);
        this.errorMessage = err.error?.message || 'Erreur lors de la modification de la catégorie.';
      }
    });
  }

  deleteCategorie(id: number) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie de main d’œuvre ?')) return;
    this.categorieService.delete(id).subscribe({
      next: () => {
        this.showSuccess('Catégorie supprimée avec succès.');
        this.loadData();
      },
      error: (err) => {
        console.error('Erreur suppression catégorie', err);
        this.errorMessage = err.error?.message || 'Erreur lors de la suppression de la catégorie.';
      }
    });
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.markForCheck();
    }, 3500);
  }
}
