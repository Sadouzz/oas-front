import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Sur le modèle de clientGuard (client-portal/guards/client.guard.ts) : n'autorise l'accès
 * au portail technicien qu'à un compte technicien authentifié.
 */
export const technicienGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.hasRole('ROLE_TECHNICIEN')) return true;

  router.navigate(['/login'], { replaceUrl: true });
  return false;
};
