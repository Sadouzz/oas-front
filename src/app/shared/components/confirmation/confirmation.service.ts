import { Injectable, signal } from '@angular/core';

export interface ConfirmationRequest {
  message: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  readonly request = signal<ConfirmationRequest | null>(null);
  private resolveRequest: ((confirmed: boolean) => void) | null = null;

  confirm(message: string, options: Partial<Omit<ConfirmationRequest, 'message'>> = {}): Promise<boolean> {
    if (this.resolveRequest) this.resolveRequest(false);
    return new Promise(resolve => {
      this.resolveRequest = resolve;
      this.request.set({
        message,
        title: options.title ?? 'Confirmation',
        confirmLabel: options.confirmLabel ?? 'Confirmer',
        cancelLabel: options.cancelLabel ?? 'Annuler',
        danger: options.danger ?? false,
      });
    });
  }

  close(confirmed: boolean): void {
    const resolve = this.resolveRequest;
    this.resolveRequest = null;
    this.request.set(null);
    resolve?.(confirmed);
  }
}
