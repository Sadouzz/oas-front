import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private routerSub?: Subscription;

  today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  openSection: string | null = null;

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
