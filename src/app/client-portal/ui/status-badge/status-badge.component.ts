import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export type BadgeTone = 'pending' | 'success' | 'danger' | 'info' | 'neutral';

const TONE_CLASSES: Record<BadgeTone, string> = {
  pending: 'bg-oas-warn-bg text-oas-warn',
  success: 'bg-oas-ok-bg text-oas-ok',
  danger: 'bg-oas-bad-bg text-oas-bad',
  info: 'bg-oas-info-bg text-oas-info',
  neutral: 'bg-gray-100 text-gray-500',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <span class="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" [class]="toneClass">
      {{ label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input() label = '';
  @Input() tone: BadgeTone = 'neutral';

  get toneClass(): string {
    return TONE_CLASSES[this.tone];
  }
}
