import { Component, inject, OnInit } from '@angular/core';
import { HistoryService, ConnectionHistoryModel } from '../../services/history.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  private historyService = inject(HistoryService);

  history: ConnectionHistoryModel[] = [];
  filtered: ConnectionHistoryModel[] = [];
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
  }

  formatDate(ts: string): string {
    if (!ts) return '–';
    return new Date(ts).toLocaleString('fr-FR');
  }

  statusClass(status: string): string {
    if (!status) return 'bg-gray-100 text-gray-600';
    const s = status.toUpperCase();
    if (s === 'SUCCESS') return 'bg-green-100 text-green-800';
    if (s === 'FAILURE' || s === 'FAILED') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  }
}
