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

  const authReq = req.clone({
    headers,
    withCredentials: true
  });

  const isClientArea = router.url.startsWith('/client');

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Ne pas faire logout si c'est la tentative de connexion (signin) qui a échoué
        if (!req.url.includes('/signin')) {
          authService.logout();
        }
        router.navigate(['/login'], { replaceUrl: true });
      } else if (error.status === 403) {
        router.navigate(['/forbidden'], { replaceUrl: true });
      }

      return throwError(() => error);
    })
  );
};

