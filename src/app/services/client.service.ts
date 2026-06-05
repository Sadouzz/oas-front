import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserModel {
  id: number;
  matricule: string;
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  enabled: boolean;
  createdAt: string;
  role?: string;
}

export interface UserUpdatePayload {
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface CreateClientPayload {
  matricule: string;
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class ClientService {
  private api = 'http://localhost:9090/api/clients';

  constructor(private http: HttpClient) {}

  getAll(keyword?: string): Observable<UserModel[]> {
    const params: Record<string, string> = keyword ? { keyword } : {};
    return this.http.get<UserModel[]>(this.api, { params });
  }

  getRecent(): Observable<UserModel[]> {
    return this.http.get<UserModel[]>(`${this.api}/recent`);
  }

  getById(id: number): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.api}/${id}`);
  }

  update(id: number, data: UserUpdatePayload): Observable<UserModel> {
    return this.http.put<UserModel>(`${this.api}/${id}`, data);
  }

  archive(id: number): Observable<string> {
    return this.http.patch<string>(`${this.api}/${id}/archive`, {});
  }

  unarchive(id: number): Observable<string> {
    return this.http.patch<string>(`${this.api}/${id}/unarchive`, {});
  }

  create(data: CreateClientPayload): Observable<void> {
    return this.http.post<void>('http://localhost:9090/api/auth/signup', {
      ...data,
      type: 'CLIENT',
    });
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }
}
