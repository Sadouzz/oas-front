import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CLIENT_PORTAL_PATHS } from '../../client/client-portal.paths';

export const clientNoAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    router.navigate([CLIENT_PORTAL_PATHS.tableauDeBord], { replaceUrl: true });
    return false;
  }
  return true;
};
