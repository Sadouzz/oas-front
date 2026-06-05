import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Token présent mais expiré → déconnexion + notification sur la page login
  if (authService.getToken() && authService.isTokenExpired()) {
    authService.logout();
    router.navigate(['/login'], { replaceUrl: true, queryParams: { sessionExpired: 'true' } });
    return throwError(() => new Error('Session expirée'));
  }

  const token = authService.getToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token rejeté par le backend (expiré ou invalide) → déconnexion + notification
        authService.logout();
        router.navigate(['/login'], { replaceUrl: true, queryParams: { sessionExpired: 'true' } });
      } else if (error.status === 403) {
        // Utilisateur authentifié mais rôle insuffisant → page forbidden, PAS de logout
        router.navigate(['/forbidden'], { replaceUrl: true });
      }
      return throwError(() => error);
    })
  );
};
