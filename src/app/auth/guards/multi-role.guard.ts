import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const multiRoleGuard = (roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.getRole();
  if (role && roles.includes(role)) return true;
  router.navigate(['/forbidden'], { replaceUrl: true });
  return false;
};
