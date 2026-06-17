import { Component } from '@angular/core';
import { LucidePercent } from '@lucide/angular';

@Component({
  selector: 'app-gestion-tva',
  standalone: true,
  imports: [LucidePercent],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <svg class="w-16 h-16 text-oas-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
      </svg>
      <div class="text-center">
        <h2 class="text-xl font-bold text-oas-ink mb-2">Gestion TVA</h2>
        <p class="text-oas-muted">Cette fonctionnalité est en cours de développement.</p>
        <p class="text-sm text-oas-faint mt-1">En attente d'implémentation backend.</p>
      </div>
    </div>
  `,
})
export class GestionTvaComponent {}
