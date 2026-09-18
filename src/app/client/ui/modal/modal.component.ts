import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-opacity animate-fade-in" (click)="onClose()">
        <div
          class="bg-white rounded-t-3xl sm:rounded-2xl w-full p-5 sm:p-6 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto shadow-2xl border border-oas-line/60"
          [class]="maxWidthClass"
          (click)="$event.stopPropagation()">
          <!-- Handle tactile pour mobile -->
          <div class="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-3 sm:hidden"></div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base sm:text-lg font-extrabold text-oas-ink">{{ title }}</h2>
            <button (click)="onClose()" aria-label="Fermer" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-oas-muted hover:text-oas-ink transition cursor-pointer">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <ng-content></ng-content>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  @Input() isOpen = true;
  @Input() title = '';
  @Input() maxWidthClass = 'max-w-lg';
  @Output() close = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
    this.closed.emit();
  }
}
