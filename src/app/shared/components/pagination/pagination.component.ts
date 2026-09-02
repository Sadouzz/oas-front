import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (total > 0 || totalPages > 0) {
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-oas-line text-xs text-oas-muted bg-white">
        <div class="flex items-center gap-1.5 text-oas-muted">
          <span>Affichage <strong class="text-oas-ink font-semibold">{{ rangeStart }}</strong>–<strong class="text-oas-ink font-semibold">{{ rangeEnd }}</strong> sur <strong class="text-oas-ink font-semibold">{{ total }}</strong> élément(s)</span>
        </div>

        <div class="flex items-center gap-1.5">
          <button (click)="onPrev()" [disabled]="page <= 1"
                  title="Page précédente"
                  class="flex items-center justify-center w-8 h-8 rounded-lg border border-oas-line bg-white hover:bg-oas-bg disabled:opacity-35 disabled:cursor-not-allowed transition text-oas-ink font-bold cursor-pointer shadow-xs">
            ‹
          </button>

          <span class="px-3 py-1 font-semibold text-oas-ink bg-oas-bg rounded-lg border border-oas-line text-xs">
            Page {{ page }} / {{ Math.max(1, totalPages) }}
          </span>

          <button (click)="onNext()" [disabled]="page >= totalPages || totalPages === 0"
                  title="Page suivante"
                  class="flex items-center justify-center w-8 h-8 rounded-lg border border-oas-line bg-white hover:bg-oas-bg disabled:opacity-35 disabled:cursor-not-allowed transition text-oas-ink font-bold cursor-pointer shadow-xs">
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
  @Output() pageChange = new EventEmitter<number>();

  protected Math = Math;

  get rangeStart(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    if (this.total === 0) return 0;
    return Math.min(this.page * this.pageSize, this.total);
  }

  onPrev(): void {
    if (this.page > 1) {
      this.prev.emit();
      this.pageChange.emit(this.page - 1);
    }
  }

  onNext(): void {
    if (this.page < this.totalPages) {
      this.next.emit();
      this.pageChange.emit(this.page + 1);
    }
  }
}
