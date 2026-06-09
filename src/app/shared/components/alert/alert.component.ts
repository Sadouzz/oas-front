import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-alert',
  standalone: true,
  template: `
    @if (success) {
      <div class="mb-4 px-4 py-3 bg-oas-ok-bg border border-oas-ok/30 text-oas-ok text-sm rounded-xl">
        {{ success }}
      </div>
    }
    @if (error) {
      <div class="mb-4 px-4 py-3 bg-oas-bad-bg border border-oas-bad/30 text-oas-bad text-sm rounded-xl">
        {{ error }}
      </div>
    }
  `,
})
export class AlertComponent {
  @Input() success = '';
  @Input() error = '';
}
