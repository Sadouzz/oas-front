import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="close.emit()">
      <div
        class="bg-white rounded-xl w-full p-6 max-h-[85vh] overflow-y-auto"
        [class]="maxWidthClass"
        (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-extrabold text-oas-ink">{{ title }}</h2>
          <button (click)="close.emit()" class="text-oas-muted hover:text-oas-ink text-xl leading-none cursor-pointer">×</button>
        </div>
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class ModalComponent {
  @Input() title = '';
  @Input() maxWidthClass = 'max-w-lg';
  @Output() close = new EventEmitter<void>();
}
