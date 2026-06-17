import { Component, inject, OnInit } from '@angular/core';
import { HistoryService } from '../../services/history.service';
import { ConnectionHistoryModel } from '../../shared/models';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { LucideSearch, LucideX, LucideClock, LucideUser, LucideCheck, LucideAlertCircle } from '@lucide/angular';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [PaginationComponent, LucideSearch, LucideX, LucideClock, LucideUser, LucideCheck, LucideAlertCircle],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  private historyService = inject(HistoryService);

  history: ConnectionHistoryModel[] = [];
  filtered: ConnectionHistoryModel[] = [];
  page = 1;
  readonly pageSize = 10;
  loading = false;

  ngOnInit() {
    this.loading = true;
    this.historyService.getAll().subscribe({
      next: (data) => {
        this.history = data.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        this.filtered = this.history;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase().trim();
    this.filtered = term
      ? this.history.filter(h =>
          h.username.toLowerCase().includes(term) ||
          h.ipAddress?.toLowerCase().includes(term) ||
          h.status?.toLowerCase().includes(term)
        )
      : this.history;
    this.page = 1;
  }

  get paged(): ConnectionHistoryModel[] { return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize); }
  get totalPages(): number { return Math.max(1, Math.ceil(this.filtered.length / this.pageSize)); }
  prevPage(): void { if (this.page > 1) this.page--; }
  nextPage(): void { if (this.page < this.totalPages) this.page++; }

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
