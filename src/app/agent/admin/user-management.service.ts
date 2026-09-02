import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminUserUpdatePayload, CreateUserPayload, UserModel } from '../../shared/models';

export type { AdminUserUpdatePayload, CreateUserPayload, UserModel };

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/admin/users`;

  getAll(keyword?: string): Observable<UserModel[]> {
    const params: Record<string, string> = keyword ? { keyword } : {};
    return this.http.get<UserModel[]>(this.api, { params });
  }

  getById(id: number): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.api}/${id}`);
  }

  create(data: CreateUserPayload): Observable<string> {
    return this.http.post<string>(`${this.api}/create`, data, { responseType: 'text' as 'json' });
  }

  update(id: number, data: AdminUserUpdatePayload): Observable<UserModel> {
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
