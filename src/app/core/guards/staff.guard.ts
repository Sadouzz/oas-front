import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const STAFF_ROLES = ['ROLE_SUPER_AGENT', 'ROLE_MASTER', 'ROLE_AGENT', 'ROLE_CHEF_ATELIER', 'ROLE_AGENT_MAGASIN'];

/**
 * Ferme l'accès au dashboard staff aux comptes clients : la plupart des routes
 * enfants de LayoutComponent n'ont aucun garde de rôle propre, seule cette
 * garde parente empêche un ROLE_CLIENT authentifié d'y entrer.
 */
export const staffGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  const role = authService.getRole();
  if (role && STAFF_ROLES.includes(role)) return true;

  router.navigate(['/forbidden'], { replaceUrl: true });
  return false;
};
