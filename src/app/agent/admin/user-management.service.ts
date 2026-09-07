import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminUserUpdatePayload, CreateUserPayload, UserModel, PageParams } from '../../shared/models';

export type { AdminUserUpdatePayload, CreateUserPayload, UserModel };

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/users`;

  getAll(params?: PageParams | string): Observable<any> {
    const queryParams: Record<string, string> = {};
    if (typeof params === 'string') {
      if (params) queryParams['keyword'] = params;
    } else if (params) {
      if (params.page !== undefined) queryParams['page'] = params.page.toString();
      if (params.size !== undefined) queryParams['size'] = params.size.toString();
      if (params.keyword) queryParams['keyword'] = params.keyword;
    }
    return this.http.get<any>(this.api, { params: queryParams });
  }

  getAllUnpaged(): Observable<UserModel[]> {
    return this.http.get<UserModel[]>(`${this.api}/all`);
  }

  getCurrentUser(): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.api}/me`);
  }

  updateCurrentUser(data: Partial<UserModel>): Observable<UserModel> {
    return this.http.put<UserModel>(`${this.api}/me`, data);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/me/change-password`, { oldPassword, newPassword });
  }

  getById(id: number): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.api}/${id}`);
  }

  create(data: CreateUserPayload): Observable<any> {
    return this.http.post<any>(`${this.api}/create`, data);
  }

  update(id: number, data: AdminUserUpdatePayload): Observable<UserModel> {
    return this.http.put<UserModel>(`${this.api}/${id}`, data);
  }

  toggleStatus(id: number): Observable<UserModel> {
    return this.http.patch<UserModel>(`${this.api}/${id}/toggle-status`, {});
  }

  archive(id: number): Observable<any> {
    return this.http.patch<any>(`${this.api}/${id}/archive`, {});
  }

  unarchive(id: number): Observable<any> {
    return this.http.patch<any>(`${this.api}/${id}/unarchive`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.api}/${id}`);
  }

  getRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/roles`);
  }

  getTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/types`);
  }
}

