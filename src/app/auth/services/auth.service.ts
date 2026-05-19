import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  matricule: string;
  phone: string;
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  type: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:9090/api/auth';

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/signin`, credentials).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response));
      })
    );
  }

  register(data: RegisterRequest): Observable<void> {
    const { login, ...rest } = data;
    return this.http.post<void>(`${this.apiUrl}/signup`, { ...rest, username: login });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  getRole(): string | null {
    const user = localStorage.getItem('user');
    if (!user) return null;
    return JSON.parse(user).role;
  }

  hasRole(role: string): boolean {
    return this.getRole() === role;
  }

  getUser(): AuthResponse | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}
