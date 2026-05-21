import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
})
export class LayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  get user() {
    return this.authService.getUser();
  }

  get fullName(): string {
    const u = this.user;
    return u ? u.username : '';
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

  isSuperAgent(): boolean {
    return this.authService.hasRole('ROLE_SUPER_AGENT');
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
