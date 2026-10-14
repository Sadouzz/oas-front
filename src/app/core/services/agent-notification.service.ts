import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgentNotification } from '../../shared/models/agent-notification.model';
import { NotificationPage } from '../../shared/models/notification-page.model';

@Injectable({
  providedIn: 'root'
})
export class AgentNotificationService {
  private apiUrl = `${environment.apiUrl}/api/notifications`;

  constructor(private http: HttpClient) {}

  getNotificationPage(page = 0, size = 50): Observable<NotificationPage<AgentNotification>> {
    return this.http.get<NotificationPage<AgentNotification>>(`${this.apiUrl}/page`, { params: { page, size } });
  }

  markAsRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/read-all`, {});
  }
}
