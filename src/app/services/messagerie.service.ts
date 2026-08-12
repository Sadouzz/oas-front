import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AgentMessage, ClientConversation } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class MessagerieService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/admin/portal/messages`;

  getConversations(): Observable<ClientConversation[]> {
    return this.http.get<ClientConversation[]>(`${this.api}/clients`);
  }

  getThread(clientId: number): Observable<AgentMessage[]> {
    return this.http.get<AgentMessage[]>(`${this.api}/clients/${clientId}`);
  }

  reply(clientId: number, contenu: string): Observable<AgentMessage> {
    return this.http.post<AgentMessage>(`${this.api}/clients/${clientId}`, { contenu });
  }
}
