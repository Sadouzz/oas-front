import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserModel, UserUpdatePayload } from '../shared/models';

export type { UserModel, UserUpdatePayload };

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/clients`;

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

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }
}
