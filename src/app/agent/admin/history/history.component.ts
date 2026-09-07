import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { HistoryService } from './history.service';
import { ConnectionHistoryModel } from '../../../shared/models/index';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { BasePaginatedComponent } from '../../../shared/components/base-paginated.component';
import { LucideSearch, LucideClock, LucideLoader2 } from '@lucide/angular';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [PaginationComponent, LucideSearch, LucideClock, LucideLoader2],
  templateUrl: './history.component.html',
})
export class HistoryComponent extends BasePaginatedComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private historyService = inject(HistoryService);

  history: ConnectionHistoryModel[] = [];
  filtered: ConnectionHistoryModel[] = [];
  loading = false;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.load();
  }

  load() {
    this.loading = true;
    this.historyService.getAll(this.getPageParams()).subscribe({
      next: (data) => {
        const list = this.applyPageResponse<ConnectionHistoryModel>(data);
        this.history = list.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.applyFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.history = [];
        this.filtered = [];
        this.totalElements = 0;
        this.serverTotalPages = 1;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilter() {
    let data = this.history;
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      data = data.filter(h =>
        h.username?.toLowerCase().includes(term) ||
        h.ipAddress?.toLowerCase().includes(term) ||
        h.status?.toLowerCase().includes(term)
      );
    }
    this.filtered = data;
  }

  // onSearch is inherited from BasePaginatedComponent

  get paged(): ConnectionHistoryModel[] {
    return this.filtered;
  }

  formatDate(ts: string): string {
    if (!ts) return '–';
    return new Date(ts).toLocaleString('fr-FR');
  }

  statusClass(status: string): string {
    if (!status) return 'bg-oas-bg text-oas-muted';
    const s = status.toUpperCase();
    if (s === 'SUCCESS') return 'bg-oas-ok-bg text-oas-ok';
    if (s === 'FAILURE' || s === 'FAILED') return 'bg-oas-bad-bg text-oas-bad';
    return 'bg-oas-bg text-oas-muted';
  }
}
