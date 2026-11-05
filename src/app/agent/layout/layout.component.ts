import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { AgentNotificationService } from '../../core/services/agent-notification.service';
import { NotificationWsService } from '../../core/services/notification-ws.service';
import { LiveNotificationService } from '../../core/services/live-notification.service';
import { AgentNotification } from '../../shared/models/agent-notification.model';
import { GarageContextService } from '../../core/services/garage-context.service';
import { PushOptInComponent } from '../../shared/components/push-opt-in/push-opt-in.component';
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
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, PushOptInComponent],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private notificationService = inject(AgentNotificationService);
  private notificationWsService = inject(NotificationWsService);
  private liveNotificationService = inject(LiveNotificationService);
  private garageContext = inject(GarageContextService);
  private router = inject(Router);
  private routerSub?: Subscription;
  private wsSub?: Subscription;
  private notificationInterval: any;
  private notificationsInitialized = false;
  private totalUnreadNotifications = 0;
  hasMoreNotifications = false;
  private notificationPage = 0;

  openSection: string | null = null;
  notificationsOpen = false;
  notifications: AgentNotification[] = [];
  openSubSection: string | null = 'pieces';
  
  isSidebarOpen = false;
  retractableMode = false;
  get isCollapsed(): boolean { return this.retractableMode; }
  set isCollapsed(val: boolean) { this.retractableMode = val; }
  hoverSection: string | null = null;
  hoverSubSection: string | null = null;
  pinnedSection: string | null = null;
  isSubmenuExpanded = false;
  private submenuPreviewTimer: number | undefined;

  get activeSection(): string | null {
    return this.hoverSection || this.pinnedSection || this.openSection;
  }

  get showFlyout(): boolean {
    return Boolean(this.hoverSection || this.pinnedSection);
  }

  get activeSubSection(): string | null {
    if (this.hoverSection || this.pinnedSection) return this.hoverSubSection;
    return this.openSubSection;
  }
  
  activeGarageName: string | null = null;
  
  get unreadCount(): number {
    return this.totalUnreadNotifications;
  }

  get notificationSoundEnabled(): boolean { return this.liveNotificationService.soundEnabled; }
  setNotificationSoundEnabled(enabled: boolean): void { this.liveNotificationService.setSoundEnabled(enabled); }

  private readonly routeLabels: Record<string, { label: string; section?: string }> = {
    '/profil': { label: 'Mon profil' },
    '/dashboard': { label: 'Tableau de bord' },
    '/clients': { label: 'Clients' },
    '/vehicules': { label: 'Véhicules' },
    '/bons-de-sortie': { label: 'Bon de sortie', section: 'Gestion Stock' },
    '/historique-bs': { label: 'Historique', section: 'Gestion Stock' },
    '/inventaire': { label: 'Inventaire', section: 'PDP' },
    '/seuil-alertes': { label: 'Seuil alertes', section: 'PDP' },
    '/pdp': { label: 'PDP', section: 'Catalogue' },
    '/pdg': { label: 'PDG', section: 'Catalogue' },
    '/pieces-detachees': { label: 'PDP', section: 'Catalogue' },
    '/pieces-generees': { label: 'PDG', section: 'Catalogue' },
    '/stock': { label: 'Historique', section: 'PDP' },
    '/bons-reception': { label: 'Bon de réception', section: 'Réapprovisionnement' },
    '/fournisseurs': { label: 'Fournisseurs', section: 'Réapprovisionnement' },
    '/factures': { label: 'Facture', section: 'Facture TTC' },
    '/bons-livraison': { label: 'Bon de livraison', section: 'Facture TTC' },
    '/bons-commande': { label: 'BC', section: 'Facture TTC' },
    '/proformas': { label: 'Proforma', section: 'Facture TTC' },
    '/avoirs-ttc': { label: 'Avoir TTC', section: 'Facture TTC' },
    '/notes-prix': { label: 'Note de prix', section: 'Facture HT' },
    // '/devis': { label: 'Devis', section: 'Facture HT' },
    '/devis-previsionnels': { label: 'Devis Prévisionnel', section: 'Facture HT' },
    '/avoirs-ht': { label: 'Avoir note de prix', section: 'Facture HT' },
    '/gestion-tva': { label: 'Configuration fiscale globale' },
    '/gestion-recu': { label: 'Gestion reçu' },
    '/admin/main-doeuvre': { label: "Main d'œuvre" },
    '/admin/parametres': { label: 'Paramètres', section: 'Administration' },
    '/admin/parametres/depots': { label: 'Dépôts', section: 'Paramètres' },
    '/admin/parametres/categories': { label: 'Catégories de Pièces', section: 'Paramètres' },
    '/admin/parametres/categories-main-doeuvre': { label: "Catégories Main d'œuvre", section: 'Paramètres' },
    '/admin/parametres/fiche-atelier': { label: 'Fiche Atelier', section: 'Paramètres' },
    '/ordres-reparation': { label: 'Ordres de réparation', section: 'Processus de réparation' },
    '/ordres-reparation/nouveau': { label: 'Nouvel ordre de réparation', section: 'Processus de réparation' },
    '/ordres-travail': { label: 'Ordres de travail', section: 'Processus de réparation' },
    '/diagnostics': { label: 'Diagnostic', section: 'Processus de réparation' },
    '/diagnostic': { label: 'Diagnostic', section: 'Processus de réparation' },
    '/techniciens': { label: 'Techniciens', section: 'Processus de réparation' },
    '/rendezvous': { label: 'Rendez-vous' },
    '/admin/users': { label: 'Utilisateurs', section: 'Administration' },
    '/admin/pdf-templates': { label: 'Modèles PDF', section: 'Administration' },
    '/admin/history': { label: 'Historique connexions', section: 'Administration' },
  };

  private getRelativeUrl(url: string): string {
    let rel = url.split('?')[0];
    if (rel.startsWith('/app')) {
      rel = rel.substring('/app'.length);
    } else if (rel.startsWith('/agent')) {
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
    const crumbs: { label: string; link?: string }[] = [{ label: 'Tableau de bord', link: '/app/dashboard' }];
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
    try {
      const saved = localStorage.getItem('oas_sidebar_collapsed');
      if (saved !== null) {
        this.isCollapsed = saved === 'true';
      }
    } catch (_) {}
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
    this.notificationWsService.connect();

    this.wsSub = this.notificationWsService.notifications$.subscribe({
      next: (notif) => {
        if (!notif) return;
        const exists = this.notifications.some(n => n.id === notif.id);
        if (!exists) {
          this.notifications.unshift(notif);
          if (!notif.lu) this.totalUnreadNotifications++;
          this.liveNotificationService.notify(notif);
          this.cdr.markForCheck();
        }
      },
      error: (err) => console.error('Erreur flux notifications WS', err)
    });
  }

  leaveGarage() {
    this.garageContext.leaveGarage();
    this.router.navigate(['/app/dashboard'], { replaceUrl: true });
  }

  ngOnDestroy() {
    if (this.routerSub) this.routerSub.unsubscribe();
    if (this.wsSub) this.wsSub.unsubscribe();
    if (this.notificationInterval) clearInterval(this.notificationInterval);
    window.clearTimeout(this.submenuPreviewTimer);
    this.notificationWsService.disconnect();
  }

  loadNotifications(page = 0, append = false) {
    this.notificationService.getNotificationPage(page).subscribe({
      next: (result) => {
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
      error: (err) => console.error('Erreur chargement notifications', err)
    });
  }

  loadMoreNotifications(): void { this.loadNotifications(this.notificationPage + 1, true); }

  private mergeNotifications(primary: AgentNotification[], secondary: AgentNotification[]): AgentNotification[] {
    const byId = new Map<number, AgentNotification>();
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
  }

  markAsRead(notification: AgentNotification) {
    if (notification.lu) return;
    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.lu = true;
        this.totalUnreadNotifications = Math.max(0, this.totalUnreadNotifications - 1);
        this.cdr.markForCheck();
      }
    });
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.lu = true);
        this.totalUnreadNotifications = 0;
        this.cdr.markForCheck();
      }
    });
  }

  private syncSection(url: string) {
    const relUrl = this.getRelativeUrl(url);
    if (['/fiches-atelier', '/ordres-reparation', '/ordres-travail', '/diagnostics', '/diagnostic', '/techniciens'].some(p => relUrl.startsWith(p))) {
      this.openSection = 'atelier';
    } else if (relUrl.startsWith('/pieces-generees') || relUrl.startsWith('/pdg')) {
      this.openSection = 'pieces';
      this.openSubSection = 'pdg';
    } else if (relUrl.startsWith('/pieces-detachees') || relUrl.startsWith('/pdp')) {
      this.openSection = 'pieces';
      const parsed = this.router.parseUrl(url);
      if (parsed.queryParams['type'] === 'PDG') {
        this.openSubSection = 'pdg';
      } else {
        this.openSubSection = 'pdp';
      }
    } else if (['/stock', '/seuil-alertes', '/inventaire'].some(p => relUrl.startsWith(p)) && !relUrl.startsWith('/historique-bs')) {
      this.openSection = 'pieces';
      this.openSubSection = 'pdp';
    } else if (['/bons-de-sortie', '/historique-bs'].some(p => relUrl.startsWith(p))) {
      this.openSection = 'stock';
      this.openSubSection = 'bs';
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
    } else if (relUrl.startsWith('/gestion-tva')) {
      this.openSection = 'admin';
      this.openSubSection = 'parametres';
    } else if (relUrl.startsWith('/admin/parametres')) {
      this.openSection = 'admin';
      this.openSubSection = 'parametres';
    } else if (relUrl.startsWith('/admin') && !relUrl.startsWith('/admin/main-doeuvre')) {
      this.openSection = 'admin';
    } else {
      this.openSection = null;
    }
    this.pinnedSection = null;
    this.hoverSection = null;
    this.hoverSubSection = null;
    this.isSubmenuExpanded = false;
    this.closeSidebar();
  }

  toggleSection(section: string) {
    this.openSection = this.openSection === section ? null : section;
  }

  toggleSubSection(subSection: string) {
    this.openSubSection = this.openSubSection === subSection ? null : subSection;
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  onMenuHover(section: string): void {
    if (!this.retractableMode) return;
    this.hoverSection = section;
    this.hoverSubSection = null;
    this.cdr.markForCheck();
  }

  onSubmenuHoverPreview(subSection: string): void {
    if (!this.retractableMode) return;
    window.clearTimeout(this.submenuPreviewTimer);
    this.submenuPreviewTimer = window.setTimeout(() => {
      this.hoverSubSection = subSection;
      this.cdr.markForCheck();
    }, 100);
  }

  onSubMenuHover(subSection: string, focusLeaf = false): void {
    if (this.retractableMode) {
      window.clearTimeout(this.submenuPreviewTimer);
      this.hoverSubSection = subSection;
      this.cdr.markForCheck();
      if (focusLeaf) {
        setTimeout(() => document.querySelector<HTMLElement>('[data-nav-level="leaf"] [data-nav-back]')?.focus());
      }
    }
  }

  onGlobalNavLeave(): void {
    this.hoverSection = null;
    if (!this.pinnedSection) this.hoverSubSection = null;
    window.clearTimeout(this.submenuPreviewTimer);
    this.cdr.markForCheck();
  }

  onGlobalNavFocusLeave(event: FocusEvent): void {
    const nextTarget = event.relatedTarget;
    // Angular peut retirer le bouton focalisé lors du passage au niveau suivant.
    if (!nextTarget) return;
    if (nextTarget instanceof Node && event.currentTarget instanceof HTMLElement
      && event.currentTarget.contains(nextTarget)) return;
    this.pinnedSection = null;
    this.hoverSection = null;
    this.hoverSubSection = null;
    this.isSubmenuExpanded = false;
    this.cdr.markForCheck();
  }

  onFlyoutKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (this.activeSubSection) {
      this.onSubmenuBack();
      return;
    }
    this.closeFlyout(true);
  }

  onSelectLink(): void {
    this.hoverSection = null;
    this.hoverSubSection = null;
    this.pinnedSection = null;
    this.isSubmenuExpanded = false;
    this.closeSidebar();
    this.cdr.markForCheck();
  }

  toggleRetractableMode(): void {
    this.retractableMode = !this.retractableMode;
    this.closeSidebar();
    try {
      localStorage.setItem('oas_retractable_mode', String(this.retractableMode));
      localStorage.setItem('oas_sidebar_collapsed', String(this.retractableMode));
    } catch (_) {}
    this.isSubmenuExpanded = false;
    this.syncSection(this.router.url);
    this.cdr.markForCheck();
  }

  toggleCollapse(): void {
    this.toggleRetractableMode();
  }

  closeFlyout(restoreFocus = false): void {
    const section = this.hoverSection || this.pinnedSection;
    this.pinnedSection = null;
    this.hoverSection = null;
    this.hoverSubSection = null;
    this.isSubmenuExpanded = false;
    this.cdr.markForCheck();
    if (restoreFocus && section) {
      const trigger = document.querySelector<HTMLElement>(`[data-nav-section="${section}"]`);
      if (trigger && document.activeElement !== trigger) {
        trigger.focus();
      }
    }
  }

  handleSectionClick(section: string): void {
    if (this.isCollapsed) {
      if (this.pinnedSection === section) {
        this.pinnedSection = null;
        this.hoverSection = null;
        this.hoverSubSection = null;
        this.isSubmenuExpanded = false;
      } else {
        this.pinnedSection = section;
        this.hoverSection = null;
        this.isSubmenuExpanded = true;
        this.hoverSubSection = null;
        setTimeout(() => document.querySelector<HTMLElement>('[data-nav-level="section"] [data-nav-first]')?.focus());
      }
    } else {
      this.toggleSection(section);
    }
    this.cdr.markForCheck();
  }

  onSubmenuBack(): void {
    const subSection = this.hoverSubSection;
    this.hoverSubSection = null;
    this.cdr.markForCheck();
    if (subSection) {
      setTimeout(() => document.querySelector<HTMLElement>(`[data-nav-subsection="${subSection}"]`)?.focus());
    }
  }

  getSubSectionTitle(subSection: string | null): string {
    const titles: Record<string, string> = {
      facture: 'Facture',
      bl: 'Bons de livraison',
      bc: 'Bons de commande',
      proforma: 'Proforma',
      'avoir-ttc': 'Avoir TTC',
      pdp: 'Pièces de détail',
      pdg: 'Pièces de gros',
      'note-prix': 'Notes de prix',
      devis: 'Devis prévisionnels',
      'avoir-ht': 'Avoirs HT',
      parametres: 'Paramètres',
      systeme: 'Système et utilisateurs',
    };
    return subSection ? titles[subSection] ?? subSection : '';
  }

  getSectionTitle(section: string | null): string {
    switch (section) {
      case 'atelier': return 'Processus de réparation';
      case 'pieces': return 'Pièces détachées';
      case 'facture-ht': return 'Facture HT';
      case 'facture-ttc': return 'Facture TTC';
      case 'stock': return 'Gestion Stock';
      case 'reappro': return 'Réapprovisionnement';
      case 'admin': return 'Administration';
      default: return '';
    }
  }

  isSectionCurrent(section: string): boolean {
    const relUrl = this.getRelativeUrl(this.router.url);
    switch (section) {
      case 'atelier':
        return ['/fiches-atelier', '/ordres-reparation', '/ordres-travail', '/diagnostics', '/diagnostic', '/techniciens'].some(p => relUrl.startsWith(p));
      case 'pieces':
        return ['/pieces-detachees', '/pieces-generees', '/pdp', '/pdg', '/stock', '/seuil-alertes', '/inventaire'].some(p => relUrl.startsWith(p)) && !relUrl.startsWith('/historique-bs');
      case 'facture-ht':
        return ['/notes-prix', '/notes-de-prix', '/devis', '/devis-previsionnels', '/avoirs-ht'].some(p => relUrl.startsWith(p));
      case 'facture-ttc':
        return ['/factures', '/bons-livraison', '/bons-commande', '/proformas', '/avoirs-ttc'].some(p => relUrl.startsWith(p));
      case 'stock':
        return ['/bons-de-sortie', '/historique-bs'].some(p => relUrl.startsWith(p));
      case 'reappro':
        return ['/bons-reception', '/fournisseurs'].some(p => relUrl.startsWith(p));
      case 'admin':
        return (relUrl.startsWith('/admin') && !relUrl.startsWith('/admin/main-doeuvre')) || relUrl.startsWith('/gestion-tva');
      default:
        return false;
    }
  }

  logout(): void {
    this.notificationWsService.disconnect();
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
