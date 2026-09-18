import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DiagnosticService } from './diagnostic.service';
import { AlertComponent } from '../../shared/components/alert/alert.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../shared/components/base-paginated.component';
import { StatutDiagnostic } from '../../shared/models';
import { DiagnosticListResponse } from './models/diagnostic.model';

@Component({
  selector: 'app-diagnostics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AlertComponent, PaginationComponent],
  templateUrl: './diagnostics.component.html'
})
export class DiagnosticsComponent extends BasePaginatedComponent implements OnInit, OnDestroy {
  private diagnosticService = inject(DiagnosticService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  diagnostics: DiagnosticListResponse[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  activeFilter: 'TOUS' | 'EN_ATTENTE' | 'EN_COURS' | 'TERMINE' | 'VALIDE' = 'TOUS';

  private searchTimeout: any;

  override pageSize = 10;

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  override loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const extra: Record<string, any> = {};
    if (this.activeFilter !== 'TOUS') {
      extra['statut'] = this.activeFilter;
    }
    if (this.searchTerm && this.searchTerm.trim()) {
      extra['search'] = this.searchTerm.trim();
    }

    const diagParams = {
      page: this.page - 1,
      size: this.pageSize,
      ...extra
    };

    this.diagnosticService.getAll(diagParams).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (diags) => {
        this.diagnostics = this.applyPageResponse<DiagnosticListResponse>(diags);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erreur lors du chargement des diagnostics.';
        this.cdr.markForCheck();
      }
    });
  }

  setFilter(filter: 'TOUS' | 'EN_ATTENTE' | 'EN_COURS' | 'TERMINE' | 'VALIDE'): void {
    this.activeFilter = filter;
    this.page = 1;
    this.loadData();
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.page = 1;
      this.loadData();
    }, 350);
  }

  getStatutLabel(statut: StatutDiagnostic): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'En attente';
      case 'EN_COURS': return 'En cours';
      case 'TERMINE': return 'Terminé';
      case 'VALIDE': return 'Validé';
      case 'ANNULE': return 'Annulé';
      default: return statut;
    }
  }

  openDiagnostic(d: DiagnosticListResponse): void {
    this.router.navigate(['/app/ordres-reparation', d.ordreReparationId, 'diagnostic']);
  }
}
