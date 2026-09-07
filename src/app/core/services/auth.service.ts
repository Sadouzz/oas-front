import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
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

  constructor() {
    this.scheduleAutoRefresh();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<any>(`${this.api}/signin`, credentials, { withCredentials: true }).pipe(
      map(res => (res && res.data) ? res.data : res),
      tap((response: AuthResponse) => {
        if (response && response.token) {
          // Stockage dans les cookies uniquement
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
    return this.http.post<any>(`${this.api}/refresh`, {}, { withCredentials: true }).pipe(
      map(res => (res && res.data) ? res.data : res),
      tap((response: AuthResponse) => {
        if (response && response.token) {
          this.cookieService.set('token', response.token, 7);
          if (response.username) this.cookieService.set('username', response.username, 7);
          if (response.role) this.cookieService.set('role', response.role, 7);

          if (response.garageId && response.garageName) {
            this.garageContext.enterGarage(response.garageId, response.garageName);
          }
          this.scheduleAutoRefresh();
        }
      })
    );
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
      next: () => {},
      error: () => {}
    });
    this.cookieService.delete('token');
    this.cookieService.delete('username');
    this.cookieService.delete('role');
    this.garageContext.leaveGarage();
    this.clearAutoRefreshTimer();
  }

  getToken(): string | null {
    return this.cookieService.get('token');
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
              console.warn('[AuthService] Échec du rafraîchissement automatique du token:', err);
              if (this.isTokenExpired()) {
                this.logout();
                this.router.navigate(['/login'], { replaceUrl: true });
              }
            }
          });
        }, refreshDelay);
      } else {
        // Token déjà expiré, tenter un refresh immédiat
        this.refreshToken().subscribe({
          next: () => {},
          error: () => {
            this.logout();
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

