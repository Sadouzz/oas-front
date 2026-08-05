import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserModel } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ClientPortalService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client`;

  getMe(): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.api}/me`);
  }
}
