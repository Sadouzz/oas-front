import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (requiredRole: string):
  CanActivateFn => () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasRole(requiredRole)) {
    return true;
  }

  router.navigate(['/forbidden'], { replaceUrl: true });
  return false;
};
