import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientNotification } from '../models';
import { NotificationPage } from '../../shared/models/notification-page.model';

@Injectable({ providedIn: 'root' })
export class ClientNotificationService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/notifications`;

  getPage(page = 0, size = 50): Observable<NotificationPage<ClientNotification>> {
    return this.http.get<NotificationPage<ClientNotification>>(`${this.api}/page`, { params: { page, size } });
  }

  markAsRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/lu`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.api}/lu-tout`, {});
  }
}
