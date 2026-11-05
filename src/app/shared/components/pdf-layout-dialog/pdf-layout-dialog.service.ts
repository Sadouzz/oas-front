import { EnvironmentInjector, Injectable, createEnvironmentInjector, importProvidersFrom, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { PdfLayoutKey } from './pdf-layout-dialog.component';

@Injectable({ providedIn: 'root' })
export class PdfLayoutDialogService {
  private readonly injector = inject(EnvironmentInjector);

  async chooseLayout(): Promise<PdfLayoutKey | null> {
    const [dialogModule, componentModule] = await Promise.all([
      import('@angular/cdk/dialog'),
      import('./pdf-layout-dialog.component'),
    ]);
    const dialogInjector = createEnvironmentInjector(
      [importProvidersFrom(dialogModule.DialogModule)],
      this.injector,
    );
    const dialog = dialogInjector.get(dialogModule.Dialog);
    const ref = dialog.open<PdfLayoutKey | null, undefined, import('./pdf-layout-dialog.component').PdfLayoutDialogComponent>(componentModule.PdfLayoutDialogComponent, {
      width: 'min(92vw, 460px)',
      maxWidth: '92vw',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      ariaLabel: 'Choisir la présentation du PDF',
      panelClass: 'oas-pdf-layout-dialog',
    });
    try {
      return (await firstValueFrom(ref.closed)) ?? null;
    } finally {
      dialogInjector.destroy();
    }
  }
}
