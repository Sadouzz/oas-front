import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientNotificationService } from './client-notification.service';
import { ClientNotification } from '../models';
import { AlertComponent } from '../../shared/components/alert/alert.component';

@Component({
  selector: 'app-client-notifications',
  standalone: true,
  imports: [CommonModule, AlertComponent],
  templateUrl: './client-notifications.component.html',
})
export class ClientNotificationsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private service = inject(ClientNotificationService);

  notifications: ClientNotification[] = [];
  loading = false;
  errorMessage = '';

  get unreadCount(): number {
    return this.notifications.filter(n => !n.lu).length;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: notifs => { this.notifications = notifs; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); this.errorMessage = 'Impossible de charger vos notifications.'; },
    });
  }

  markAsRead(notification: ClientNotification): void {
    if (notification.lu) return;
    this.service.markAsRead(notification.id).subscribe({ next: () => notification.lu = true });
  }

  markAllAsRead(): void {
    this.service.markAllAsRead().subscribe({ next: () => this.notifications.forEach(n => n.lu = true) });
  }
}
