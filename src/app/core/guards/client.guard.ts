import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CLIENT_PORTAL_PATHS } from '../../client/client-portal.paths';

export const clientGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.hasRole('ROLE_CLIENT')) return true;

  router.navigate([CLIENT_PORTAL_PATHS.connexion], { replaceUrl: true });
  return false;
};
