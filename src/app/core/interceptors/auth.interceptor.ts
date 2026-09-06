import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { GarageContextService } from '../services/garage-context.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const garageContextService = inject(GarageContextService);
  const token = authService.getToken();
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

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Ne pas tenter de refresh si la requête était déjà signin, signup, refresh ou signout
        const isAuthEndpoint = req.url.includes('/signin') ||
                               req.url.includes('/signup') ||
                               req.url.includes('/refresh') ||
                               req.url.includes('/signout');

        if (isAuthEndpoint) {
          if (req.url.includes('/refresh')) {
            isRefreshing = false;
            refreshTokenSubject.next(null);
            authService.logout();
            router.navigate(['/login'], { replaceUrl: true });
          }
          return throwError(() => error);
        }

        return handle401Error(req, next, authService, router, garageContextService);
      } else if (error.status === 403) {
        router.navigate(['/forbidden'], { replaceUrl: true });
      }

      return throwError(() => error);
    })
  );
};

function handle401Error(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
  garageContextService: GarageContextService
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        const newToken = res?.token || authService.getToken();
        refreshTokenSubject.next(newToken);

        let headers = req.headers;
        if (newToken) {
          headers = headers.set('Authorization', `Bearer ${newToken}`);
        }
        const activeGarageId = garageContextService.getActiveGarageId();
        if (activeGarageId && activeGarageId > 0) {
          headers = headers.set('X-Garage-ID', activeGarageId.toString());
        }

        return next(req.clone({ headers, withCredentials: true }));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        authService.logout();
        router.navigate(['/login'], { replaceUrl: true });
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        let headers = req.headers;
        if (token) {
          headers = headers.set('Authorization', `Bearer ${token}`);
        }
        const activeGarageId = garageContextService.getActiveGarageId();
        if (activeGarageId && activeGarageId > 0) {
          headers = headers.set('X-Garage-ID', activeGarageId.toString());
        }
        return next(req.clone({ headers, withCredentials: true }));
      })
    );
  }
}


