import { Component, inject } from '@angular/core';
import { DialogModule, DialogRef } from '@angular/cdk/dialog';

export type PdfLayoutKey = 'AVEC_ENTETE' | 'SANS_ENTETE';

@Component({
  selector: 'app-pdf-layout-dialog',
  standalone: true,
  imports: [DialogModule],
  template: `
    <section class="w-full max-w-md rounded-2xl bg-white p-6 text-oas-ink">
      <h2 class="text-lg font-bold">Choisir la présentation du PDF</h2>
      <p class="mt-2 text-sm text-oas-muted">Sélectionnez le format à télécharger.</p>
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" (click)="choose('AVEC_ENTETE')"
          class="rounded-xl border border-oas-line bg-white px-4 py-3 text-sm font-semibold hover:border-oas-accent hover:bg-oas-accent-bg focus:outline-none focus:ring-2 focus:ring-oas-accent">
          Avec en-tête
        </button>
        <button type="button" (click)="choose('SANS_ENTETE')"
          class="rounded-xl border border-oas-line bg-white px-4 py-3 text-sm font-semibold hover:border-oas-accent hover:bg-oas-accent-bg focus:outline-none focus:ring-2 focus:ring-oas-accent">
          Sans en-tête
        </button>
      </div>
      <div class="mt-5 flex justify-end">
        <button type="button" (click)="cancel()" class="rounded-lg px-4 py-2 text-sm font-semibold text-oas-muted hover:bg-oas-bg focus:outline-none focus:ring-2 focus:ring-oas-accent">Annuler</button>
      </div>
    </section>
  `,
})
export class PdfLayoutDialogComponent {
  private readonly dialogRef = inject(DialogRef<PdfLayoutKey | null, PdfLayoutDialogComponent>);

  choose(layout: PdfLayoutKey): void { this.dialogRef.close(layout); }
  cancel(): void { this.dialogRef.close(null); }
}
