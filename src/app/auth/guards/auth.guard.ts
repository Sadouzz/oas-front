import {AuthService} from '../services/auth.service';
import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';

export const authGuard: CanActivateFn = () => {
  const authServce = inject(AuthService);
  const router = inject(Router);

  if (authServce.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login'], { replaceUrl: true });
  return false;
}
