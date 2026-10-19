import { Component, HostListener, inject } from '@angular/core';
import { ConfirmationService } from './confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  template: `
    @if (confirmation.request(); as request) {
      <div class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 p-4" (click)="confirmation.close(false)">
        <section role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-message"
          class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" (click)="$event.stopPropagation()">
          <h2 id="confirmation-title" class="text-lg font-bold text-oas-ink">{{ request.title }}</h2>
          <p id="confirmation-message" class="mt-3 text-sm leading-6 text-oas-muted">{{ request.message }}</p>
          <div class="mt-6 flex justify-end gap-3">
            <button type="button" class="rounded-lg border border-oas-line px-4 py-2 text-sm font-semibold text-oas-ink hover:bg-oas-bg" (click)="confirmation.close(false)">{{ request.cancelLabel }}</button>
            <button type="button" class="rounded-lg px-4 py-2 text-sm font-semibold text-white" [class.bg-red-600]="request.danger" [class.hover:bg-red-700]="request.danger" [class.bg-oas-accent]="!request.danger" (click)="confirmation.close(true)">{{ request.confirmLabel }}</button>
          </div>
        </section>
      </div>
    }
  `,
})
export class ConfirmationDialogComponent {
  readonly confirmation = inject(ConfirmationService);

  @HostListener('document:keydown.escape') onEscape(): void {
    if (this.confirmation.request()) this.confirmation.close(false);
  }
}
