import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgentNotification } from '../../shared/models/agent-notification.model';

@Injectable({
  providedIn: 'root'
})
export class AgentNotificationService {
  private apiUrl = `${environment.apiUrl}/api/v1/agent-notifications`;

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<AgentNotification[]> {
    return this.http.get<AgentNotification[]>(this.apiUrl);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllAsRead(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/read-all`, {});
  }
}
