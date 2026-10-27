import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap, BehaviorSubject, filter, take, finalize } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { GarageContextService } from '../services/garage-context.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);
const AUTH_RETRY = new HttpContextToken<boolean>(() => false);

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
          // Pour /refresh, AuthService réessaie une fois (rotation du cookie par un autre onglet);
          // les appelants (initAuth, garde, handle401Error) gèrent la déconnexion finale.
          return throwError(() => error);
        }

        if (req.context.get(AUTH_RETRY)) {
          authService.logout();
          router.navigate(['/login'], { replaceUrl: true });
          return throwError(() => error);
        }

        return handle401Error(req, next, authService, router, garageContextService);
      } else if (error.status === 403) {
        if (!req.url.includes('/api/technicien/')) {
          router.navigate(['/forbidden'], { replaceUrl: true });
        }
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
  // Si un autre onglet a déjà rafraîchi le jeton, utiliser immédiatement le nouveau jeton sans relancer un refresh concurrent
  const currentToken = authService.getToken();
  const reqAuth = req.headers.get('Authorization');
  if (currentToken && reqAuth && reqAuth !== `Bearer ${currentToken}`) {
    return next(buildRetryRequest(req, currentToken, garageContextService));
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((res: any) => {
        const newToken = res?.token || authService.getToken();
        if (!newToken) throw new Error('Aucun jeton d’accès reçu après renouvellement.');
        refreshTokenSubject.next(newToken);

        return next(buildRetryRequest(req, newToken, garageContextService));
      }),
      catchError((err) => {
        // Release concurrent 401 requests as well; leaving the subject at null
        // would keep their observables pending forever.
        refreshTokenSubject.next('');
        if (err?.status === 401 || err?.status === 403) {
          authService.logout();
          router.navigate(['/login'], { replaceUrl: true });
        }
        return throwError(() => err);
      }),
      finalize(() => {
        isRefreshing = false;
        if (refreshTokenSubject.value !== '') refreshTokenSubject.next(null);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        if (!token) return throwError(() => new Error('La session a expiré.'));
        return next(buildRetryRequest(req, token, garageContextService));
      })
    );
  }
}

function buildRetryRequest(req: HttpRequest<any>, token: string, garageContextService: GarageContextService) {
  let headers = req.headers.set('Authorization', `Bearer ${token}`);
  const activeGarageId = garageContextService.getActiveGarageId();
  if (activeGarageId && activeGarageId > 0) {
    headers = headers.set('X-Garage-ID', activeGarageId.toString());
  }
  return req.clone({ headers, context: req.context.set(AUTH_RETRY, true), withCredentials: true });
}


