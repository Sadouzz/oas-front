import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { resolveMarqueLogo } from './marque-logos';

let nextId = 0;

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg' | 'xl', { wrapper: string; logoImg: string; fallback: string }> = {
  sm: { wrapper: 'w-10 h-10', logoImg: 'w-9 h-9', fallback: 'w-5 h-5' },
  md: { wrapper: 'w-12 h-12', logoImg: 'w-11 h-11', fallback: 'w-6 h-6' },
  lg: { wrapper: 'w-16 h-16', logoImg: 'w-14 h-14', fallback: 'w-9 h-9' },
  xl: { wrapper: 'w-24 h-24', logoImg: 'w-20 h-20', fallback: 'w-14 h-14' },
};

@Component({
  selector: 'app-vehicle-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="rounded-full bg-oas-bg flex items-center justify-center flex-shrink-0 overflow-hidden" [class]="sizeClass.wrapper">
      @if (logoPath) {
        <img [src]="logoPath" [alt]="marque ?? 'Véhicule'" class="object-contain" [class]="sizeClass.logoImg" />
      } @else {
        <svg [class]="sizeClass.fallback" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient [attr.id]="gradId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--color-oas-accent)" />
              <stop offset="100%" stop-color="var(--color-oas-accent-dark)" />
            </linearGradient>
          </defs>
          <ellipse cx="24" cy="38" rx="14" ry="2.5" fill="currentColor" class="text-oas-line" />
          <path [attr.fill]="'url(#' + gradId + ')'"
            d="M9 27l2.6-9.1A5 5 0 0116.4 14h15.2a5 5 0 014.8 3.9L38 27v6a2 2 0 01-2 2h-1a2 2 0 01-2-2v-1H15v1a2 2 0 01-2 2h-1a2 2 0 01-2-2v-6z" />
          <circle cx="15" cy="33" r="3.2" fill="#0c2742" />
          <circle cx="33" cy="33" r="3.2" fill="#0c2742" />
          <path d="M13 20h22" stroke="rgba(255,255,255,0.55)" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      }
    </div>
  `,
})
export class VehicleAvatarComponent {
  @Input() marque: string | null | undefined = null;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'sm';

  readonly gradId = `vehicle-avatar-grad-${nextId++}`;

  get logoPath(): string | null {
    return resolveMarqueLogo(this.marque);
  }

  get sizeClass() {
    return SIZE_CLASSES[this.size];
  }
}
