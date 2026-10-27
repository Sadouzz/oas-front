import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, finalize, shareReplay } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, CheckAvailabilityResponse } from '../../shared/models';
import { Router } from '@angular/router';
import { GarageContextService } from './garage-context.service';
import { CookieService } from './cookie.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private garageContext = inject(GarageContextService);
  private cookieService = inject(CookieService);
  private api = `${environment.apiUrl}/api/auth`;
  private expirationTimer: any;
  private accessToken: string | null = null;
  private refreshInFlight?: Observable<AuthResponse>;

  constructor() {
    // Nettoie tout résidu éventuel de localStorage pour garantir le stockage exclusif sur cookies
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('oas_access_token');
      }
    } catch {
      // Ignorer si le stockage est restreint
    }

    this.setupLifecycleListeners();

    // Si un jeton valide est présent dans les cookies, initialiser le jeton et le timer
    const token = this.getToken();
    if (token && !this.isTokenExpired()) {
      this.scheduleAutoRefresh();
    }
  }

  /**
   * Initialisation au démarrage d'Angular (APP_INITIALIZER) :
   * - Si un jeton d'accès valide est déjà présent dans les cookies (ex: nouvel onglet via Ctrl+Clic),
   *   résout immédiatement sans appel réseau bloquant.
   * - Si le jeton est manquant ou proche de l'expiration, tente un rafraîchissement via le refresh token.
   */
  initAuth(): Promise<void> {
    const token = this.getToken();
    const hasSession = !!(token || this.cookieService.get('username') || this.cookieService.get('role'));

    if (!hasSession) {
      return Promise.resolve();
    }

    // Si le jeton présent dans les cookies est toujours valide (marge de sécurité de 60s),
    // pas besoin d'appel réseau bloquant au démarrage de l'onglet !
    if (token && !this.tokenExpiresSoon(60_000)) {
      this.scheduleAutoRefresh();
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.refreshToken().subscribe({
        next: () => {
          resolve();
        },
        error: (err) => {
          // Si le serveur rejette avec 401/403 et qu'on n'a aucun jeton valide dans les cookies
          if (!token || this.isTokenExpired()) {
            if (err?.status === 401 || err?.status === 403) {
              this.logout();
            }
          }
          resolve();
        }
      });
    });
  }

  /**
   * Écoute le retour sur l'onglet (sortie de veille du PC ou changement d'onglet)
   * et la reconnexion au réseau pour rafraîchir le jeton proactivement avant expiration.
   */
  private setupLifecycleListeners(): void {
    if (typeof window === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndRefreshIfNecessary();
      }
    });

    window.addEventListener('online', () => {
      this.checkAndRefreshIfNecessary();
    });
  }

  private checkAndRefreshIfNecessary(): void {
    const hasSessionCookie = !!(this.cookieService.get('username') || this.cookieService.get('role'));
    if (!hasSessionCookie) return;

    const token = this.getToken();
    if (!token || this.isTokenExpired() || this.tokenExpiresSoon(120_000)) {
      this.refreshToken().subscribe({
        next: () => { },
        error: (err) => {
          if (err?.status === 401 || err?.status === 403) {
            this.logout();
            this.router.navigate(['/login'], { replaceUrl: true });
          }
        }
      });
    }
  }

  tokenExpiresSoon(thresholdMs = 60_000): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const { exp } = jwtDecode<{ exp: number }>(token);
      return (exp * 1000) - Date.now() <= thresholdMs;
    } catch {
      return true;
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<any>(`${this.api}/signin`, credentials, { withCredentials: true }).pipe(
      map(res => (res && res.data) ? res.data : res),
      tap((response: AuthResponse) => {
        if (response && response.token) {
          this.accessToken = response.token;
          this.cookieService.set('token', response.token, 7);
          this.cookieService.set('username', response.username, 7);
          this.cookieService.set('role', response.role, 7);

          if (response.garageId && response.garageName) {
            this.garageContext.enterGarage(response.garageId, response.garageName);
          }
          this.scheduleAutoRefresh();
        }
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = this.http.post<any>(`${this.api}/refresh`, {}, { withCredentials: true }).pipe(
      map(res => (res && res.data) ? res.data : res),
      tap((response: AuthResponse) => {
        if (response && response.token) {
          this.accessToken = response.token;
          this.cookieService.set('token', response.token, 7);
          if (response.username) this.cookieService.set('username', response.username, 7);
          if (response.role) this.cookieService.set('role', response.role, 7);

          if (response.garageId && response.garageName) {
            this.garageContext.enterGarage(response.garageId, response.garageName);
          }
          this.scheduleAutoRefresh();
        }
      }),
      finalize(() => { this.refreshInFlight = undefined; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.refreshInFlight;
  }

  register(data: RegisterRequest): Observable<void> {
    const { login, ...rest } = data;
    return this.http.post<void>(`${this.api}/signup`, { ...rest, username: login }, { withCredentials: true });
  }

  checkUsername(username: string): Observable<CheckAvailabilityResponse> {
    return this.http.get<CheckAvailabilityResponse>(`${this.api}/check-username`, { params: { username }, withCredentials: true });
  }

  checkEmail(email: string): Observable<CheckAvailabilityResponse> {
    return this.http.get<CheckAvailabilityResponse>(`${this.api}/check-email`, { params: { email }, withCredentials: true });
  }

  logout(): void {
    this.http.post(`${this.api}/signout`, {}, { withCredentials: true }).subscribe({
      next: () => { },
      error: () => { }
    });
    this.accessToken = null;
    this.cookieService.delete('token');
    this.cookieService.delete('username');
    this.cookieService.delete('role');
    this.garageContext.leaveGarage();
    this.clearAutoRefreshTimer();
  }

  getToken(): string | null {
    if (!this.accessToken) {
      const cookieToken = this.cookieService.get('token');
      if (cookieToken) {
        this.accessToken = cookieToken;
      }
    }
    return this.accessToken;
  }

  /**
   * Vérifie la validité du JWT ou la présence d'une session.
   * Ne force pas le logout immédiat pour permettre le rafraîchissement automatique via le refresh token.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const role = this.getRole();

    if (token) {
      try {
        const { exp } = jwtDecode<{ exp: number }>(token);
        return Date.now() < exp * 1000 || !!role;
      } catch {
        return !!role;
      }
    }

    return !!role;
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const { exp } = jwtDecode<{ exp: number }>(token);
      return Date.now() >= exp * 1000;
    } catch {
      return true;
    }
  }

  /**
   * Planifie un rafraîchissement proactif du token avant son expiration (1 minute avant).
   */
  private scheduleAutoRefresh() {
    const token = this.getToken();
    if (!token) return;

    try {
      const { exp } = jwtDecode<{ exp: number }>(token);
      const expiresIn = (exp * 1000) - Date.now();

      this.clearAutoRefreshTimer();

      if (expiresIn > 0) {
        // Rafraîchir 1 minute avant expiration (ou à mi-parcours si le délai est inférieur à 1 minute)
        const refreshDelay = expiresIn > 60_000 ? expiresIn - 60_000 : Math.max(5_000, expiresIn / 2);

        this.expirationTimer = setTimeout(() => {
          this.refreshToken().subscribe({
            next: () => {
              // Nouveau token obtenu et nouveau timer planifié dans le tap()
            },
            error: (err) => {
              console.warn('[AuthService] Échec du rafraîchissement proactif du token:', err);
              if (err?.status === 401 || err?.status === 403) {
                this.logout();
                this.router.navigate(['/login'], { replaceUrl: true });
              } else {
                // Erreur réseau temporaire : réessayer dans 10 secondes au lieu de déconnecter brutalement
                this.clearAutoRefreshTimer();
                this.expirationTimer = setTimeout(() => this.scheduleAutoRefresh(), 10_000);
              }
            }
          });
        }, refreshDelay);
      } else {
        // Token déjà expiré, tenter un refresh immédiat
        this.refreshToken().subscribe({
          next: () => { },
          error: (err) => {
            if (err?.status === 401 || err?.status === 403) {
              this.logout();
              this.router.navigate(['/login'], { replaceUrl: true });
            } else {
              this.clearAutoRefreshTimer();
              this.expirationTimer = setTimeout(() => this.scheduleAutoRefresh(), 5_000);
            }
          }
        });
      }
    } catch {
      this.clearAutoRefreshTimer();
    }
  }

  private clearAutoRefreshTimer() {
    if (this.expirationTimer) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  /**
   * Rôle lu depuis les cookies (valeur fournie par le backend à la connexion).
   */
  getRole(): string | null {
    return this.cookieService.get('role');
  }

  hasRole(role: string): boolean {
    return this.getRole() === role;
  }

  getUsername(): string | null {
    return this.cookieService.get('username');
  }

  getUserId(): number | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const decoded = jwtDecode<any>(token);
      return decoded.id ?? decoded.userId ?? null;
    } catch {
      return null;
    }
  }

  getUser(): { username: string; role: string } | null {
    const username = this.getUsername();
    const role = this.getRole();
    if (!username || !role) return null;
    return { username, role };
  }

  getMe(): Observable<any> {
    return this.http.get<any>(`${this.api}/me`);
  }

  updateMe(data: any): Observable<any> {
    return this.http.put<any>(`${this.api}/me`, data);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.api}/me/change-password`, { oldPassword, newPassword });
  }
}
