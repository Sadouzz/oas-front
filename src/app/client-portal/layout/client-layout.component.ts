import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ClientNotificationService } from '../services/client-notification.service';
import { ClientNotification } from '../models';
import { CLIENT_PORTAL_PATHS } from '../client-portal.paths';
import { ClientMessagerieWidgetComponent } from '../messagerie/client-messagerie-widget.component';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ClientMessagerieWidgetComponent],
  templateUrl: './client-layout.component.html',
})
export class ClientLayoutComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private notificationService = inject(ClientNotificationService);
  private router = inject(Router);
  private routerSub?: Subscription;
  private notificationInterval: any;

  notificationsOpen = false;
  profileMenuOpen = false;
  notifications: ClientNotification[] = [];
  mobileMenuOpen = false;
  sidebarCollapsed = false;

  get unreadCount(): number {
    return this.notifications.filter(n => !n.lu).length;
  }

  readonly paths = CLIENT_PORTAL_PATHS;

  private readonly routeLabels: Record<string, string> = {
    [CLIENT_PORTAL_PATHS.tableauDeBord]: 'Tableau de bord',
    [CLIENT_PORTAL_PATHS.vehicules]: 'Mes véhicules',
    [CLIENT_PORTAL_PATHS.rendezVous]: 'Mes rendez-vous',
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
        this.mobileMenuOpen = false;
        this.profileMenuOpen = false;
      });

    this.loadNotifications();
    this.notificationInterval = setInterval(() => this.loadNotifications(), 10000);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    if (this.notificationInterval) clearInterval(this.notificationInterval);
  }

  loadNotifications() {
    this.notificationService.getAll().subscribe({
      next: notifs => this.notifications = notifs,
      error: err => console.error('Erreur chargement notifications', err),
    });
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
      next: () => notification.lu = true,
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => this.notifications.forEach(n => n.lu = true),
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate([CLIENT_PORTAL_PATHS.connexion], { replaceUrl: true });
  }
}
