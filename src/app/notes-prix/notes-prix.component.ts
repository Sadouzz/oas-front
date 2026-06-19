import { Component } from '@angular/core';
import { LucideCalculator } from '@lucide/angular';

@Component({
  selector: 'app-notes-prix',
  standalone: true,
  imports: [LucideCalculator],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <svg class="w-16 h-16 text-oas-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
      </svg>
      <div class="text-center">
        <h2 class="text-xl font-bold text-oas-ink mb-2">Notes de prix (Factures HT)</h2>
        <p class="text-oas-muted">Cette fonctionnalité est en cours de développement.</p>
        <p class="text-sm text-oas-faint mt-1">En attente d'implémentation backend.</p>
      </div>
    </div>
  `,
})
export class NotesPrixComponent {}
