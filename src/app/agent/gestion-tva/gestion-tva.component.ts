import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FiscalConfigurationService } from './fiscal-configuration.service';
import { FiscalConfiguration } from './fiscal-configuration.model';

@Component({
  selector: 'app-gestion-tva',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mx-auto max-w-3xl space-y-6">
      <header class="rounded-xl border border-oas-line bg-white p-6 shadow-sm">
        <h1 class="text-2xl font-bold text-oas-ink">Configuration fiscale globale</h1>
        <p class="mt-2 text-sm text-oas-muted">Ces paramètres s’appliquent aux nouvelles émissions dans tous les garages. Les documents déjà émis conservent leurs montants.</p>
      </header>
      @if (error) { <div role="alert" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div> }
      @if (loading) { <div role="status" class="rounded-lg border border-oas-line bg-white p-4 text-sm text-oas-muted">Chargement de la configuration…</div> }
      @if (success) { <div role="status" class="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{{ success }}</div> }
      <form class="space-y-5 rounded-xl border border-oas-line bg-white p-6 shadow-sm" (ngSubmit)="save()">
        <label class="block space-y-2"><span class="text-sm font-semibold text-oas-ink">Taux de TVA (%)</span>
          <input class="w-full rounded-lg border border-oas-line px-3 py-2" type="number" min="0" max="100" step="0.01" required [(ngModel)]="config.tvaRate" name="tvaRate" [disabled]="saving">
        </label>
        <label class="block space-y-2"><span class="text-sm font-semibold text-oas-ink">Timbre fiscal (FCFA)</span>
          <input class="w-full rounded-lg border border-oas-line px-3 py-2" type="number" min="0" step="1" required [(ngModel)]="config.timbreFiscal" name="timbreFiscal" [disabled]="saving">
        </label>
        <div class="flex justify-end"><button class="rounded-lg bg-oas-accent px-5 py-2.5 font-semibold text-white disabled:opacity-50" type="submit" [disabled]="saving">{{ saving ? 'Enregistrement…' : 'Enregistrer les paramètres' }}</button></div>
      </form>
    </div>
  `,
})
export class GestionTvaComponent implements OnInit {
  private service = inject(FiscalConfigurationService);
  config: FiscalConfiguration = { id: 1, tvaRate: 18, timbreFiscal: 100 };
  loading = true;
  saving = false;
  error = '';
  success = '';

  ngOnInit(): void {
    this.service.getCurrent().subscribe({
      next: value => { this.config = value; this.loading = false; },
      error: err => {
        this.error = err?.error?.message ?? 'Impossible de charger la configuration fiscale. Vous pouvez saisir les valeurs et réessayer l’enregistrement.';
        this.loading = false;
      },
    });
  }

  save(): void {
    this.error = '';
    this.success = '';
    if ([this.config.tvaRate, this.config.timbreFiscal].some(v => !Number.isFinite(Number(v)) || Number(v) < 0) || this.config.tvaRate > 100) {
      this.error = 'Vérifiez les taux (0 à 100 %) et les montants (positifs).';
      return;
    }
    this.saving = true;
    this.service.update(this.config).subscribe({
      next: value => { this.config = value; this.success = 'Configuration fiscale enregistrée.'; this.error = ''; this.saving = false; },
      error: err => {
        const status = err?.status;
        this.error = err?.error?.message ?? (status === 403
          ? 'Votre compte n’est pas autorisé à modifier la configuration fiscale.'
          : status === 401
            ? 'Votre session a expiré. Reconnectez-vous puis réessayez.'
            : 'Impossible d’enregistrer la configuration. Vérifiez votre connexion et réessayez.');
        this.saving = false;
      },
    });
  }
}
