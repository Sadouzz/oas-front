import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-stepper',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-bold uppercase tracking-wide text-oas-muted">Progression</span>
        <span class="text-sm font-extrabold text-oas-accent">{{ percent }}%</span>
      </div>
      <div class="h-2 rounded-full bg-oas-line overflow-hidden mb-6">
        <div class="h-full bg-oas-accent rounded-full transition-all duration-500" [style.width.%]="percent"></div>
      </div>

      <div class="flex items-start">
        @for (step of steps; track step; let i = $index; let last = $last) {
          <div class="flex flex-col items-center flex-1 relative">
            @if (!last) {
              <div class="absolute top-4 left-1/2 w-full h-0.5"
                   [class.bg-oas-accent]="i < currentIndex" [class.bg-oas-line]="i >= currentIndex"></div>
            }
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold relative z-10 flex-shrink-0"
                 [class.bg-oas-accent]="i <= currentIndex" [class.text-white]="i <= currentIndex"
                 [class.bg-oas-bg]="i > currentIndex" [class.text-oas-faint]="i > currentIndex">
              @if (i < currentIndex) {
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              } @else {
                {{ i + 1 }}
              }
            </div>
            <p class="text-[10px] font-semibold text-center mt-2 px-1 leading-tight"
               [class.text-oas-ink]="i <= currentIndex" [class.text-oas-faint]="i > currentIndex">{{ step }}</p>
            <p class="text-[9px] text-center mt-0.5"
               [class.text-oas-ok]="i < currentIndex" [class.text-oas-accent]="i === currentIndex" [class.text-oas-faint]="i > currentIndex">
              {{ i < currentIndex ? 'Terminée' : i === currentIndex ? 'En cours' : 'À venir' }}
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ProgressStepperComponent {
  @Input() steps: readonly string[] = [];
  @Input() currentIndex = 0;

  get percent(): number {
    if (this.steps.length === 0) return 0;
    return Math.round(((this.currentIndex + 1) / this.steps.length) * 100);
  }
}
