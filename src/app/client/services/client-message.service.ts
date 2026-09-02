import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Message, MessageRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientMessageService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/messages`;

  getThread(): Observable<Message[]> {
    return this.http.get<Message[]>(this.api);
  }

  send(payload: MessageRequest): Observable<Message> {
    return this.http.post<Message>(this.api, payload);
  }
}
