import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive,
    LucideHouse, LucideUsers, LucideCar, LucidePackage, LucideReceipt,
    LucideFileText, LucideSettings, LucideLogOut, LucideChevronDown,
    LucideWrench, LucideClipboardList, LucidePercent,
  ],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private routerSub?: Subscription;

  openSection: string | null = null;

  private readonly routeLabels: Record<string, { label: string; section?: string }> = {
    '/dashboard': { label: 'Tableau de bord' },
    '/clients': { label: 'Clients' },
    '/vehicules': { label: 'Véhicules' },
    '/bons-de-sortie': { label: 'Bon de sortie', section: 'Gestion de stock' },
    '/pieces-detachees': { label: 'Pièce détachée', section: 'Gestion de stock' },
    '/stock': { label: 'Historique', section: 'Gestion de stock' },
    '/inventaire': { label: 'Inventaire', section: 'Gestion de stock' },
    '/fournisseurs': { label: 'Fournisseurs', section: 'Gestion de stock' },
    '/factures': { label: 'Facture', section: 'Facture TTC' },
    '/bons-livraison': { label: 'Bon de livraison', section: 'Facture TTC' },
    '/bons-commande': { label: 'Bon de commande', section: 'Facture TTC' },
    '/proformas': { label: 'Proforma', section: 'Facture TTC' },
    '/avoirs-ttc': { label: 'Avoir TTC', section: 'Facture TTC' },
    '/notes-prix': { label: 'Note de prix', section: 'Facture HT' },
    '/devis-previsionnels': { label: 'Devis prévisionnel', section: 'Facture HT' },
    '/avoirs-ht': { label: 'Avoir Note de prix', section: 'Facture HT' },
    '/gestion-tva': { label: 'Gestion TVA' },
    '/gestion-recu': { label: 'Gestion reçu' },
    '/admin/main-doeuvre': { label: "Main d'œuvre" },
    '/fiches-atelier': { label: 'Fiches atelier', section: 'Atelier' },
    '/mecaniciens': { label: 'Mécaniciens', section: 'Atelier' },
    '/admin/users': { label: 'Utilisateurs', section: 'Administration' },
    '/admin/history': { label: 'Historique connexions', section: 'Administration' },
  };

  get breadcrumb(): { label: string; link?: string }[] {
    const url = this.router.url.split('?')[0];
    if (url === '/dashboard' || !this.routeLabels[url]) {
      return [{ label: 'Tableau de bord' }];
    }
    const entry = this.routeLabels[url];
    const crumbs: { label: string; link?: string }[] = [{ label: 'Tableau de bord', link: '/dashboard' }];
    if (entry.section) crumbs.push({ label: entry.section });
    crumbs.push({ label: entry.label });
    return crumbs;
  }

  get fullName(): string {
    return this.authService.getUsername() ?? '';
  }

  get roleLabel(): string {
    const role = this.authService.getRole();
    if (!role) return '';
    const labels: Record<string, string> = {
      'ROLE_SUPER_AGENT': 'Super Agent',
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
  isAgent(): boolean       { return this.authService.hasRole('ROLE_AGENT'); }
  isChefAtelier(): boolean { return this.authService.hasRole('ROLE_CHEF_ATELIER'); }
  isMagasinier(): boolean  { return this.authService.hasRole('ROLE_AGENT_MAGASIN'); }

  ngOnInit() {
    this.syncSection(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.syncSection(e.url));
  }

  ngOnDestroy() { this.routerSub?.unsubscribe(); }

  private syncSection(url: string) {
    if (['/bons-de-sortie', '/pieces-detachees', '/stock', '/inventaire', '/fournisseurs'].some(p => url.startsWith(p))) {
      this.openSection = 'stock';
    } else if (['/factures', '/bons-livraison', '/bons-commande', '/proformas', '/avoirs-ttc'].some(p => url.startsWith(p))) {
      this.openSection = 'facture-ttc';
    } else if (['/notes-prix', '/devis-previsionnels', '/avoirs-ht'].some(p => url.startsWith(p))) {
      this.openSection = 'facture-ht';
    } else if (['/fiches-atelier', '/mecaniciens'].some(p => url.startsWith(p))) {
      this.openSection = 'atelier';
    } else if (url.startsWith('/admin')) {
      this.openSection = 'admin';
    }
  }

  toggleSection(section: string) {
    this.openSection = this.openSection === section ? null : section;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
