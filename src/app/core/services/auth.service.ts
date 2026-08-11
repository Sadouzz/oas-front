import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, CheckAvailabilityResponse } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/auth`;

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/signin`, credentials).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('username', response.username);
        localStorage.setItem('role', response.role);
      })
    );
  }

  register(data: RegisterRequest): Observable<void> {
    const { login, ...rest } = data;
    return this.http.post<void>(`${this.api}/signup`, { ...rest, username: login });
  }

  checkUsername(username: string): Observable<CheckAvailabilityResponse> {
    return this.http.get<CheckAvailabilityResponse>(`${this.api}/check-username`, { params: { username } });
  }

  checkEmail(email: string): Observable<CheckAvailabilityResponse> {
    return this.http.get<CheckAvailabilityResponse>(`${this.api}/check-email`, { params: { email } });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Vérifie la présence ET l'expiration du JWT.
   * Auto-logout si le token est expiré ou malformé.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const { exp } = jwtDecode<{ exp: number }>(token);
      const valid = Date.now() < exp * 1000;
      if (!valid) this.logout();
      return valid;
    } catch {
      this.logout();
      return false;
    }
  }

  /**
   * Rôle lu depuis localStorage (valeur fournie par le backend à la connexion).
   * Non modifiable sans un nouveau login car le backend valide chaque requête.
   */
  getRole(): string | null {
    return localStorage.getItem('role');
  }

  hasRole(role: string): boolean {
    return this.getRole() === role;
  }

  getUsername(): string | null {
    return localStorage.getItem('username');
  }

  getUser(): { username: string; role: string } | null {
    const username = this.getUsername();
    const role = this.getRole();
    if (!username || !role) return null;
    return { username, role };
  }
}
