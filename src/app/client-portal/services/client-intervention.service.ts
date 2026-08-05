import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Intervention } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientInterventionService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/interventions`;

  getAll(): Observable<Intervention[]> {
    return this.http.get<Intervention[]>(this.api);
  }

  getById(id: number): Observable<Intervention> {
    return this.http.get<Intervention>(`${this.api}/${id}`);
  }
}
