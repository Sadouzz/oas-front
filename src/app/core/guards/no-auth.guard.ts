import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const role = authService.getRole();
    if (role === 'ROLE_CLIENT') {
      router.navigate(['/mon-compte'], { replaceUrl: true });
    } else if (role === 'ROLE_TECHNICIEN') {
      router.navigate(['/technicien'], { replaceUrl: true });
    } else {
      router.navigate(['/app/dashboard'], { replaceUrl: true });
    }
    return false;
  }
  return true;
};
