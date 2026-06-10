import { Component } from '@angular/core';

@Component({
  selector: 'app-gestion-recu',
  standalone: true,
  imports: [],
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <svg class="w-16 h-16 text-oas-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      <div class="text-center">
        <h2 class="text-xl font-bold text-oas-ink mb-2">Gestion des reçus</h2>
        <p class="text-oas-muted">Cette fonctionnalité est en cours de développement.</p>
        <p class="text-sm text-oas-faint mt-1">En attente d'implémentation backend.</p>
      </div>
    </div>
  `,
})
export class GestionRecuComponent {}
