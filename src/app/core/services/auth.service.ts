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
    this.scheduleAutoLogout();
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
          this.scheduleAutoLogout();
        }
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/refresh`, {}, { withCredentials: true }).pipe(
      tap(response => {
        this.cookieService.set('token', response.token, 7);
        this.cookieService.set('username', response.username, 7);
        this.cookieService.set('role', response.role, 7);

        if (response.garageId && response.garageName) {
          this.garageContext.enterGarage(response.garageId, response.garageName);
        }
        this.scheduleAutoLogout();
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
    this.clearAutoLogoutTimer();
  }

  getToken(): string | null {
    return this.cookieService.get('token');
  }

  /**
   * Vérifie la présence ET l'expiration du JWT.
   * Auto-logout si le token est expiré ou malformé.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const role = this.getRole();

    if (token) {
      try {
        const { exp } = jwtDecode<{ exp: number }>(token);
        const valid = Date.now() < exp * 1000;
        if (!valid) {
          this.logout();
          return false;
        }
        return true;
      } catch {
        return !!role;
      }
    }

    return !!role;
  }

  private scheduleAutoLogout() {
    const token = this.getToken();
    if (!token) return;

    try {
      const { exp } = jwtDecode<{ exp: number }>(token);
      const expiresIn = (exp * 1000) - Date.now();

      this.clearAutoLogoutTimer();

      if (expiresIn > 0) {
        this.expirationTimer = setTimeout(() => {
          this.logout();
          this.router.navigate(['/login'], { replaceUrl: true });
        }, expiresIn);
      } else {
        this.logout();
      }
    } catch {
      this.logout();
    }
  }

  private clearAutoLogoutTimer() {
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

  getUser(): { username: string; role: string } | null {
    const username = this.getUsername();
    const role = this.getRole();
    if (!username || !role) return null;
    return { username, role };
  }
}

