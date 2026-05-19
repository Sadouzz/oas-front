import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConnectionHistoryModel {
  id: number;
  username: string;
  ipAddress: string;
  status: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private api = 'http://localhost:9090/api/admin/connection-history';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ConnectionHistoryModel[]> {
    return this.http.get<ConnectionHistoryModel[]>(this.api);
  }
}
