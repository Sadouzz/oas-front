import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ClientNotificationService } from '../notifications/client-notification.service';
import { ClientNotification } from '../models';
import { CLIENT_PORTAL_PATHS } from '../client-portal.paths';
import { ClientMessagerieWidgetComponent } from '../messagerie/client-messagerie-widget.component';
import { PushOptInComponent } from '../../shared/components/push-opt-in/push-opt-in.component';
import { LiveNotificationService } from '../../core/services/live-notification.service';
import { NotificationWsService } from '../../core/services/notification-ws.service';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ClientMessagerieWidgetComponent, PushOptInComponent],
  templateUrl: './client-layout.component.html',
})
export class ClientLayoutComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private notificationService = inject(ClientNotificationService);
  private liveNotificationService = inject(LiveNotificationService);
  private notificationWsService = inject(NotificationWsService);
  private router = inject(Router);
  private routerSub?: Subscription;
  private wsSub?: Subscription;
  private notificationInterval: any;
  private notificationsInitialized = false;
  private totalUnreadNotifications = 0;
  hasMoreNotifications = false;
  private notificationPage = 0;

  notificationsOpen = false;
  profileMenuOpen = false;
  notifications: ClientNotification[] = [];
  sidebarCollapsed = false;
  moreDrawerOpen = false;

  get unreadCount(): number {
    return this.totalUnreadNotifications;
  }

  get notificationSoundEnabled(): boolean { return this.liveNotificationService.soundEnabled; }
  setNotificationSoundEnabled(enabled: boolean): void { this.liveNotificationService.setSoundEnabled(enabled); }

  readonly paths = CLIENT_PORTAL_PATHS;

  get isSecondaryActive(): boolean {
    const url = this.router.url;
    return url.includes(this.paths.devis) ||
           url.includes(this.paths.factures) ||
           url.includes(this.paths.proformas) ||
           url.includes(this.paths.marketplace) ||
           url.includes(this.paths.profil) ||
           url.includes(this.paths.parametres);
  }

  private readonly routeLabels: Record<string, string> = {
    [CLIENT_PORTAL_PATHS.tableauDeBord]: 'Tableau de bord',
    [CLIENT_PORTAL_PATHS.vehicules]: 'Mes véhicules',
    [CLIENT_PORTAL_PATHS.rendezVous]: 'Mes rendez-vous',
    [CLIENT_PORTAL_PATHS.marketplace]: 'Marketplace',
    [CLIENT_PORTAL_PATHS.proformas]: 'Mes proformas',
    [CLIENT_PORTAL_PATHS.devis]: 'Mes devis',
    [CLIENT_PORTAL_PATHS.factures]: 'Mes factures',
    [CLIENT_PORTAL_PATHS.interventions]: 'Mes interventions',
    [CLIENT_PORTAL_PATHS.notifications]: 'Notifications',
    [CLIENT_PORTAL_PATHS.profil]: 'Mon profil',
    [CLIENT_PORTAL_PATHS.parametres]: 'Paramètres',
  };

  get breadcrumb(): string {
    const url = this.router.url.split('?')[0];
    return this.routeLabels[url] ?? 'Tableau de bord';
  }

  get today(): string {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  }

  get fullName(): string {
    return this.authService.getUsername() ?? '';
  }

  get initials(): string {
    const name = this.fullName;
    return name ? name.slice(0, 2).toUpperCase() : 'OA';
  }

  ngOnInit() {
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.profileMenuOpen = false;
        this.moreDrawerOpen = false;
      });

    this.loadNotifications();
    this.initWebSocketNotifications();
    this.notificationInterval = setInterval(() => {
      if (!this.notificationWsService.active) this.loadNotifications();
    }, 60000);
  }

  toggleMoreDrawer(): void {
    this.moreDrawerOpen = !this.moreDrawerOpen;
  }

  closeMoreDrawer(): void {
    this.moreDrawerOpen = false;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    this.wsSub?.unsubscribe();
    if (this.notificationInterval) clearInterval(this.notificationInterval);
    this.notificationWsService.disconnect();
  }

  private initWebSocketNotifications(): void {
    this.notificationWsService.connect();
    this.wsSub = this.notificationWsService.notifications$.subscribe({
      next: notification => {
        if (!notification || this.notifications.some(item => item.id === notification.id)) return;
        this.notifications.unshift(notification);
        if (!notification.lu) this.totalUnreadNotifications++;
        this.liveNotificationService.notify(notification);
        this.cdr.markForCheck();
      },
      error: error => console.error('Erreur flux notifications WS', error),
    });
  }

  loadNotifications(page = 0, append = false) {
    this.notificationService.getPage(page).subscribe({
      next: result => {
        const received = result.content || [];
        if (this.notificationsInitialized) {
          const knownIds = new Set(this.notifications.map(notification => notification.id));
          received
            .filter(notification => !knownIds.has(notification.id))
            .forEach(notification => this.liveNotificationService.notify(notification));
        }
        this.notifications = this.mergeNotifications(append ? this.notifications : received, append ? received : this.notifications);
        this.totalUnreadNotifications = result.totalUnread;
        this.hasMoreNotifications = result.hasNext;
        this.notificationPage = result.page;
        this.notificationsInitialized = true;
        this.cdr.markForCheck();
      },
      error: err => console.error('Erreur chargement notifications', err),
    });
  }

  loadMoreNotifications(): void { this.loadNotifications(this.notificationPage + 1, true); }

  private mergeNotifications(primary: ClientNotification[], secondary: ClientNotification[]): ClientNotification[] {
    const byId = new Map<number, ClientNotification>();
    [...primary, ...secondary].forEach(notification => {
      const existing = byId.get(notification.id);
      byId.set(notification.id, existing ? { ...notification, lu: existing.lu || notification.lu } : notification);
    });
    return [...byId.values()].sort((a, b) =>
      new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime() || b.id - a.id,
    );
  }

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
    this.profileMenuOpen = false;
  }

  toggleProfileMenu() {
    this.profileMenuOpen = !this.profileMenuOpen;
    this.notificationsOpen = false;
  }

  markAsRead(notification: ClientNotification) {
    if (notification.lu) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.lu = true;
        this.totalUnreadNotifications = Math.max(0, this.totalUnreadNotifications - 1);
      },
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.lu = true);
        this.totalUnreadNotifications = 0;
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate([CLIENT_PORTAL_PATHS.connexion], { replaceUrl: true });
  }
}
