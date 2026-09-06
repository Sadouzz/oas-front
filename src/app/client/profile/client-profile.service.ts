import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserModel, UserUpdatePayload, ChangePasswordPayload } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ClientProfileService {
  private http = inject(HttpClient);

  updateProfile(id: number, payload: UserUpdatePayload): Observable<UserModel> {
    return this.http.put<UserModel>(`${environment.apiUrl}/api/clients/${id}`, payload);
  }

  changePassword(payload: ChangePasswordPayload): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/api/auth/change-password`, payload);
  }
}
