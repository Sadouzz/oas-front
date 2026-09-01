import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (totalPages > 1) {
      <div class="flex items-center justify-between px-5 py-3 border-t border-oas-line text-xs text-oas-muted">
        <span>{{ rangeStart }}–{{ rangeEnd }} sur {{ total }}</span>
        <div class="flex items-center gap-1">
          <button (click)="prev.emit()" [disabled]="page === 1"
                  class="px-2.5 py-1 rounded-lg border border-oas-line hover:bg-oas-bg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer">
            ‹
          </button>
          <span class="px-2 font-semibold text-oas-ink2">{{ page }} / {{ totalPages }}</span>
          <button (click)="next.emit()" [disabled]="page === totalPages"
                  class="px-2.5 py-1 rounded-lg border border-oas-line hover:bg-oas-bg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer">
            ›
          </button>
        </div>
      </div>
    }
  `,
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() total = 0;
  @Input() pageSize = 10;
  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  get rangeStart(): number { return (this.page - 1) * this.pageSize + 1; }
  get rangeEnd(): number { return Math.min(this.page * this.pageSize, this.total); }
}
