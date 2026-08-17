import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TECHNICIEN_PORTAL_PATHS } from '../technicien-portal.paths';

/**
 * Layout minimal du portail technicien, sur le modèle de client-portal/layout/client-layout.
 */
@Component({
  selector: 'app-technicien-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './technicien-layout.component.html',
})
export class TechnicienLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly paths = TECHNICIEN_PORTAL_PATHS;

  get fullName(): string {
    return this.authService.getUsername() ?? '';
  }

  get initials(): string {
    const name = this.fullName;
    return name ? name.slice(0, 2).toUpperCase() : 'TC';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
