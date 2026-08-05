import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.isAuthenticated() ? authService.getToken() : null;

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  const isClientArea = router.url.startsWith('/espace-client');

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Liste des préfixes de routes privées de gestion (staff/admin)
      const privateRoutes = [
        '/dashboard', '/clients', '/vehicules', '/pieces-detachees', '/bons-de-sortie',
        '/stock', '/inventaire', '/fournisseurs', '/fiches-atelier', '/mecaniciens',
        '/rendezvous', '/devis-previsionnels', '/bons-commande', '/bons-livraison',
        '/proformas', '/factures', '/avoirs-ttc', '/avoirs-ht', '/notes-prix',
        '/admin', '/gestion-tva', '/gestion-recu'
      ];
      const isPrivate = privateRoutes.some(route => router.url.startsWith(route));

      if (error.status === 401) {
        // Non authentifié → logout et redirection vers la page de connexion contextuelle
        authService.logout();
        if (isClientArea) {
          router.navigate(['/espace-client/connexion'], { replaceUrl: true });
        } else if (isPrivate) {
          router.navigate(['/login'], { replaceUrl: true });
        }
      } else if (error.status === 403) {
        // Authentifié mais pas autorisé → page interdite contextuelle
        if (isClientArea) {
          router.navigate(['/espace-client'], { replaceUrl: true });
        } else if (isPrivate) {
          router.navigate(['/forbidden'], { replaceUrl: true });
        }
      }

      return throwError(() => error);
    })
  );
};

