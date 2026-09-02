import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConnectionHistoryModel } from '../../shared/models';

export type { ConnectionHistoryModel };

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/admin/connection-history`;

  getAll(): Observable<ConnectionHistoryModel[]> {
    return this.http.get<ConnectionHistoryModel[]>(this.api);
  }
}
