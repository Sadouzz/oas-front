import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { GarageContextService } from '../services/garage-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const garageContextService = inject(GarageContextService);
  const token = authService.isAuthenticated() ? authService.getToken() : null;
  const activeGarageId = garageContextService.getActiveGarageId();

  let headers = req.headers;
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  if (activeGarageId && activeGarageId > 0) {
    headers = headers.set('X-Garage-ID', activeGarageId.toString());
  }

  const authReq = req.clone({ headers });

  const isClientArea = router.url.startsWith('/espace-client');

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ignorer les erreurs 401/403 si on est sur le site public ET pas authentifié
      const isPublicRoute = !router.url.startsWith('/gestion') && !isClientArea;
      
      if (error.status === 401) {
        authService.logout();
        if (isClientArea) {
          router.navigate(['/espace-client/connexion'], { replaceUrl: true });
        } else if (!isPublicRoute) {
          router.navigate(['/login'], { replaceUrl: true });
        }
      } else if (error.status === 403) {
        if (isClientArea) {
          router.navigate(['/espace-client'], { replaceUrl: true });
        } else if (!isPublicRoute) {
          router.navigate(['/forbidden'], { replaceUrl: true });
        }
      }

      return throwError(() => error);
    })
  );
};

