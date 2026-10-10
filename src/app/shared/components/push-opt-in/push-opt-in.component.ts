import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-push-opt-in',
  standalone: true,
  template: `
    @if (authenticated() && pushEnabled() && !subscribed()) {
      <div class="fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-xl border border-oas-line bg-white px-3 py-2 shadow-lg">
        <span class="text-xs text-oas-ink">Recevoir les notifications</span>
        <button type="button" (click)="enable()" [disabled]="busy()" class="rounded-lg bg-oas-accent px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50">{{ busy() ? '…' : 'Activer' }}</button>
        @if (error()) { <span class="sr-only" role="alert">{{ error() }}</span> }
      </div>
    }
  `
})
export class PushOptInComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = `${environment.apiUrl}/api/push`;
  readonly authenticated = signal(false);
  readonly pushEnabled = signal(false);
  readonly subscribed = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    const supported = environment.production && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
    this.pushEnabled.set(supported);
    if (supported) {
      navigator.serviceWorker.ready.then(registration => registration.pushManager.getSubscription())
        .then(subscription => this.subscribed.set(!!subscription))
        .catch(() => this.pushEnabled.set(false));
    }
    this.refreshAuth();
    this.router.events.pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshAuth());
  }

  private refreshAuth(): void { this.authenticated.set(this.auth.isAuthenticated()); }

  async enable(): Promise<void> {
    if (!this.pushEnabled() || !this.authenticated() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const key = await firstValueFrom(this.http.get<string>(`${this.api}/public-key`));
      if (!key) throw new Error('Le service de notifications n’est pas configuré.');
      if (Notification.permission !== 'granted' && await Notification.requestPermission() !== 'granted') {
        throw new Error('Autorisez les notifications dans le navigateur pour les activer.');
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.decodeVapidKey(key) as BufferSource
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.['p256dh'] || !json.keys?.['auth']) throw new Error('Abonnement du navigateur incomplet.');
      await firstValueFrom(this.http.put(`${this.api}/subscription`, { endpoint: json.endpoint, p256dh: json.keys['p256dh'], auth: json.keys['auth'] }));
      this.subscribed.set(true);
    } catch (error: any) {
      this.error.set(error?.message || 'Impossible d’activer les notifications.');
    } finally { this.busy.set(false); }
  }

  private decodeVapidKey(key: string): Uint8Array {
    const padded = key + '='.repeat((4 - key.length % 4) % 4);
    const binary = window.atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
}
