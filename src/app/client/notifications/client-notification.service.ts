import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientNotification } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientNotificationService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/notifications`;

  getAll(): Observable<ClientNotification[]> {
    return this.http.get<ClientNotification[]>(this.api);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/lu`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.api}/lu-tout`, {});
  }
}
