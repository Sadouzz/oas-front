import { Injectable, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBar, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';
import { Component } from '@angular/core';
import { Howl } from 'howler';

export interface LiveNotification {
  titre: string;
  message: string;
}

interface NotificationToastData {
  title: string;
  summary: string;
}

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [MatSnackBarModule],
  template: `
    <div class="oas-notification-toast" role="status" aria-live="polite">
      <span class="oas-notification-toast__dot" aria-hidden="true"></span>
      <div class="oas-notification-toast__content">
        <strong>{{ data.title }}</strong>
        <p>{{ data.summary }}</p>
      </div>
      <button type="button" (click)="snackBarRef.dismiss()" aria-label="Fermer la notification">×</button>
    </div>
  `,
})
export class NotificationToastComponent {
  readonly data = inject<NotificationToastData>(MAT_SNACK_BAR_DATA);
  readonly snackBarRef = inject(MatSnackBarRef<NotificationToastComponent>);
}

@Injectable({ providedIn: 'root' })
export class LiveNotificationService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly pending: LiveNotification[] = [];
  private readonly toastQueue: NotificationToastData[] = [];
  private batchTimeout?: ReturnType<typeof setTimeout>;
  private displayingToast = false;
  private sound?: Howl;
  private soundEnabledValue = this.readSoundPreference();

  get soundEnabled(): boolean {
    return this.soundEnabledValue;
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabledValue = enabled;
    try { localStorage.setItem('oas.notificationSound', String(enabled)); } catch { /* storage may be disabled */ }
    if (enabled) this.playSound();
  }

  /**
   * Regroupe les notifications reçues dans une courte fenêtre afin de détecter
   * une rafale provenant d'une même action métier.
   */
  notify(notification: LiveNotification): void {
    this.pending.push(notification);
    if (!this.batchTimeout) this.batchTimeout = setTimeout(() => this.flushBatch(), 300);
  }

  private flushBatch(): void {
    const batch = this.pending.splice(0);
    this.batchTimeout = undefined;
    if (batch.length === 0) return;

    if (this.soundEnabledValue) this.playSound();

    if (batch.length > 3) {
      this.toastQueue.push(this.countToast(batch.length));
    } else {
      this.toastQueue.push(...batch.map(notification => ({
        title: notification.titre,
        summary: this.toSummary(notification.message),
      })));
    }

    const maxQueuedToasts = this.displayingToast ? 4 : 5;
    if (this.toastQueue.length > maxQueuedToasts) {
      const collapsedCount = this.toastQueue.reduce((count, toast) => count + this.getToastCount(toast), 0);
      this.toastQueue.splice(0, this.toastQueue.length, this.countToast(collapsedCount));
    }

    this.displayNextToast();
  }

  private displayNextToast(): void {
    if (this.displayingToast) return;
    const data = this.toastQueue.shift();
    if (!data) return;

    this.displayingToast = true;
    const ref = this.snackBar.openFromComponent(NotificationToastComponent, {
      data,
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['oas-notification-snack-bar'],
    });
    ref.afterDismissed().subscribe(() => {
      this.displayingToast = false;
      this.displayNextToast();
    });
  }

  private toSummary(message: string): string {
    const normalized = message.replace(/\s+/g, ' ').trim();
    return normalized.length > 140 ? `${normalized.slice(0, 137)}…` : normalized;
  }

  private playSound(): void {
    this.sound ??= new Howl({
      src: [this.createToneUrl()],
      format: ['wav'],
      volume: 0.35,
      preload: true,
    });
    this.sound.play();
  }

  private readSoundPreference(): boolean {
    try { return localStorage.getItem('oas.notificationSound') !== 'false'; }
    catch { return true; }
  }

  private countToast(count: number): NotificationToastData {
    return { title: 'Nouvelles notifications', summary: `Vous avez ${count} notification${count === 1 ? '' : 's'}.` };
  }

  private getToastCount(toast: NotificationToastData): number {
    const match = toast.summary.match(/^Vous avez (\d+) notifications?\.$/);
    return match ? Number(match[1]) : 1;
  }

  private createToneUrl(): string {
    const sampleRate = 16000;
    const duration = 0.28;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    const write = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index++) view.setUint8(offset + index, value.charCodeAt(index));
    };

    write(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    write(8, 'WAVEfmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, samples * 2, true);

    for (let index = 0; index < samples; index++) {
      const time = index / sampleRate;
      const frequency = time < 0.13 ? 880 : 1175;
      const envelope = Math.sin(Math.PI * index / samples) * Math.exp(-2.5 * time);
      const sample = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.45;
      view.setInt16(44 + index * 2, sample * 0x7fff, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return `data:audio/wav;base64,${btoa(binary)}`;
  }
}
