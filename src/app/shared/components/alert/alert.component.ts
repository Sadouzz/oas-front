import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-alert',
  standalone: true,
  template: `
    @if (success) {
      <div class="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl">
        {{ success }}
      </div>
    }
    @if (error) {
      <div class="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
        {{ error }}
      </div>
    }
  `,
})
export class AlertComponent {
  @Input() success = '';
  @Input() error = '';
}
