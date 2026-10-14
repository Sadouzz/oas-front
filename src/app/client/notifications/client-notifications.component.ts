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
  page = 0;
  hasNext = false;
  totalUnread = 0;

  get unreadCount(): number {
    return this.totalUnread;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getPage(0).subscribe({
      next: result => {
        this.notifications = result.content;
        this.page = result.page;
        this.hasNext = result.hasNext;
        this.totalUnread = result.totalUnread;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); this.errorMessage = 'Impossible de charger vos notifications.'; },
    });
  }

  loadMore(): void {
    if (!this.hasNext || this.loading) return;
    this.loading = true;
    this.service.getPage(this.page + 1).subscribe({
      next: result => {
        this.notifications = [...this.notifications, ...result.content];
        this.page = result.page;
        this.hasNext = result.hasNext;
        this.totalUnread = result.totalUnread;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  markAsRead(notification: ClientNotification): void {
    if (notification.lu) return;
    this.service.markAsRead(notification.id).subscribe({ next: () => {
      notification.lu = true;
      this.totalUnread = Math.max(0, this.totalUnread - 1);
    } });
  }

  markAllAsRead(): void {
    this.service.markAllAsRead().subscribe({ next: () => {
      this.notifications.forEach(n => n.lu = true);
      this.totalUnread = 0;
    } });
  }
}
