import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AgentNotificationService } from '../../core/services/agent-notification.service';
import { NotificationWsService } from '../../core/services/notification-ws.service';
import { AgentNotification } from '../../shared/models/agent-notification.model';
import { GarageContextService } from '../../core/services/garage-context.service';
import { filter, Subscription } from 'rxjs';
import {
  LucideHouse,
  LucideUsers,
  LucideCar,
  LucidePackage,
  LucideReceipt,
  LucideFileText,
  LucideSettings,
  LucideLogOut,
  LucideChevronDown,
  LucideWrench,
  LucideClipboardList,
  LucidePercent,
} from '@lucide/angular';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private notificationService = inject(AgentNotificationService);
  private notificationWsService = inject(NotificationWsService);
  private garageContext = inject(GarageContextService);
  private router = inject(Router);
  private routerSub?: Subscription;
  private wsSub?: Subscription;
  private notificationInterval: any;

  openSection: string | null = null;
  notificationsOpen = false;
  notifications: AgentNotification[] = [];
  openSubSection: string | null = 'pieces';
  
  activeGarageName: string | null = null;
  
  get unreadCount(): number {
    return this.notifications.filter(n => !n.lu).length;
  }

  private readonly routeLabels: Record<string, { label: string; section?: string }> = {
    '/dashboard': { label: 'Tableau de bord' },
    '/clients': { label: 'Clients' },
    '/vehicules': { label: 'Véhicules' },
    '/bons-de-sortie': { label: 'Bon de sortie', section: 'Gestion Stock' },
    '/historique-bs': { label: 'Historique', section: 'Gestion Stock' },
    '/inventaire': { label: 'Inventaire', section: 'Gestion Stock' },
    '/seuil-alertes': { label: 'Stock', section: 'Gestion Stock' },
    '/pieces-detachees': { label: 'Liste des articles', section: 'Piéces dét' },
    '/stock': { label: 'Historique', section: 'Piéces dét' },
    '/bons-reception': { label: 'Bon de réception', section: 'Réapprovisionnement' },
    '/fournisseurs': { label: 'Fournisseurs', section: 'Réapprovisionnement' },
    '/factures': { label: 'Facture', section: 'Facture TTC' },
    '/bons-commande': { label: 'BC', section: 'Facture TTC' },
    '/proformas': { label: 'Proforma', section: 'Facture TTC' },
    '/avoirs-ttc': { label: 'Avoir TTC', section: 'Facture TTC' },
    '/notes-prix': { label: 'Note de prix', section: 'Facture HT' },
    // '/devis': { label: 'Devis', section: 'Facture HT' },
    '/devis-previsionnels': { label: 'Devis Prévisionnel', section: 'Facture HT' },
    '/avoirs-ht': { label: 'Avoir note de prix', section: 'Facture HT' },
    '/gestion-tva': { label: 'Gestion TVA' },
    '/gestion-recu': { label: 'Gestion reçu' },
    '/admin/main-doeuvre': { label: "Main d'œuvre" },
    '/admin/parametres': { label: 'Paramètres' },
    '/ordres-reparation': { label: 'Ordres de réparation', section: 'Processus de réparation' },
    '/techniciens': { label: 'Techniciens', section: 'Processus de réparation' },
    '/rendezvous': { label: 'Rendez-vous' },
    '/admin/users': { label: 'Utilisateurs', section: 'Administration' },
    '/admin/history': { label: 'Historique connexions', section: 'Administration' },
  };

  private getRelativeUrl(url: string): string {
    let rel = url.split('?')[0];
    if (rel.startsWith('/agent')) {
      rel = rel.substring('/agent'.length);
    }
    return rel === '' ? '/' : rel;
  }

  get breadcrumb(): { label: string; link?: string }[] {
    const relUrl = this.getRelativeUrl(this.router.url);
    if (relUrl === '/dashboard' || !this.routeLabels[relUrl]) {
      return [{ label: 'Tableau de bord' }];
    }
    const entry = this.routeLabels[relUrl];
    const crumbs: { label: string; link?: string }[] = [{ label: 'Tableau de bord', link: '/agent/dashboard' }];
    if (entry.section) crumbs.push({ label: entry.section });
    crumbs.push({ label: entry.label });
    return crumbs;
  }

  get today(): string {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  }

  get fullName(): string {
    return this.authService.getUsername() ?? '';
  }

  get roleLabel(): string {
    const role = this.authService.getRole();
    if (!role) return '';
    const labels: Record<string, string> = {
      'ROLE_SUPER_AGENT': 'Super Agent',
      'ROLE_MASTER': 'Master',
      'ROLE_AGENT': 'Agent',
      'ROLE_CHEF_ATELIER': 'Chef Atelier',
      'ROLE_AGENT_MAGASIN': 'Agent Magasin',
    };
    return labels[role] ?? role;
  }

  get initials(): string {
    const name = this.fullName;
    return name ? name.slice(0, 2).toUpperCase() : 'OA';
  }

  isSuperAgent(): boolean  { return this.authService.hasRole('ROLE_SUPER_AGENT'); }
  isMaster(): boolean  { return this.authService.hasRole('ROLE_MASTER'); }
  isAgent(): boolean       { return this.authService.hasRole('ROLE_AGENT'); }
  isChefAtelier(): boolean { return this.authService.hasRole('ROLE_CHEF_ATELIER'); }
  isMagasinier(): boolean  { return this.authService.hasRole('ROLE_AGENT_MAGASIN'); }

  ngOnInit() {
    this.syncSection(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.syncSection(e.url));
      
    this.loadNotifications();
    this.initWebSocketNotifications();

    // Polling de repli espacé (toutes les 60 secondes) si le WebSocket est interrompu
    this.notificationInterval = setInterval(() => {
      if (!this.notificationWsService.active) {
        this.loadNotifications();
      }
    }, 60000);

    this.garageContext.activeGarageId$.subscribe(id => {
      if (id) {
        this.activeGarageName = this.garageContext.getActiveGarageName();
      } else {
        this.activeGarageName = null;
      }
    });
  }

  private initWebSocketNotifications() {
    const role = this.authService.getRole();
    const userId = this.authService.getUserId();
    const username = this.authService.getUsername();

    this.notificationWsService.connect(role, userId, username);

    this.wsSub = this.notificationWsService.notifications$.subscribe({
      next: (notif) => {
        if (!notif) return;
        const exists = this.notifications.some(n => n.id === notif.id);
        if (!exists) {
          this.notifications.unshift(notif);
          this.cdr.markForCheck();
        }
      },
      error: (err) => console.error('Erreur flux notifications WS', err)
    });
  }

  leaveGarage() {
    this.garageContext.leaveGarage();
    this.router.navigate(['/agent/dashboard'], { replaceUrl: true });
  }

  ngOnDestroy() {
    if (this.routerSub) this.routerSub.unsubscribe();
    if (this.wsSub) this.wsSub.unsubscribe();
    if (this.notificationInterval) clearInterval(this.notificationInterval);
    this.notificationWsService.disconnect();
  }

  loadNotifications() {
    this.notificationService.getNotifications().subscribe({
      next: (notifs) => {
        this.notifications = notifs || [];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement notifications', err)
    });
  }

  toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;
  }

  markAsRead(notification: AgentNotification) {
    if (notification.lu) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.lu = true;
        this.cdr.markForCheck();
      }
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.lu = true);
        this.cdr.markForCheck();
      }
    });
  }

  private syncSection(url: string) {
    const relUrl = this.getRelativeUrl(url);
    if (['/fiches-atelier', '/ordres-reparation', '/techniciens'].some(p => relUrl.startsWith(p))) {
      this.openSection = 'atelier';
    } else if (['/pieces-detachees', '/stock'].some(p => relUrl.startsWith(p)) && !relUrl.startsWith('/historique-bs')) {
      this.openSection = 'pieces';
    } else if (['/bons-de-sortie', '/historique-bs'].some(p => relUrl.startsWith(p))) {
      this.openSection = 'stock';
      this.openSubSection = 'bs';
    } else if (['/inventaire', '/seuil-alertes'].some(p => relUrl.startsWith(p))) {
      this.openSection = 'stock';
    } else if (['/bons-reception', '/fournisseurs'].some(p => relUrl.startsWith(p))) {
      this.openSection = 'reappro';
    } else if (relUrl.startsWith('/factures')) {
      this.openSection = 'facture-ttc';
      this.openSubSection = 'facture';
    } else if (relUrl.startsWith('/bons-commande')) {
      this.openSection = 'facture-ttc';
      this.openSubSection = 'bc';
    } else if (relUrl.startsWith('/proformas')) {
      this.openSection = 'facture-ttc';
      this.openSubSection = 'proforma';
    } else if (relUrl.startsWith('/avoirs-ttc')) {
      this.openSection = 'facture-ttc';
      this.openSubSection = 'avoir-ttc';
    } else if (relUrl.startsWith('/notes-prix') || relUrl.startsWith('/notes-de-prix')) {
      this.openSection = 'facture-ht';
      this.openSubSection = 'note-prix';
    } else if (['/devis', '/devis-previsionnels'].some(p => relUrl.startsWith(p))) {
      this.openSection = 'facture-ht';
      this.openSubSection = 'devis-prev';
    } else if (relUrl.startsWith('/avoirs-ht')) {
      this.openSection = 'facture-ht';
      this.openSubSection = 'avoir-ht';
    } else if (relUrl.startsWith('/admin') && !relUrl.startsWith('/admin/main-doeuvre') && !relUrl.startsWith('/admin/parametres')) {
      this.openSection = 'admin';
    } else {
      this.openSection = null;
    }
  }

  toggleSection(section: string) {
    this.openSection = this.openSection === section ? null : section;
  }

  toggleSubSection(subSection: string) {
    this.openSubSection = this.openSubSection === subSection ? null : subSection;
  }

  logout(): void {
    this.notificationWsService.disconnect();
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
