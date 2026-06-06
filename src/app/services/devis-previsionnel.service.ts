import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DevisPrevisionnel, DevisPrevisionnelRequest } from '../shared/models';

export type { DevisPrevisionnel, DevisPrevisionnelRequest };

@Injectable({ providedIn: 'root' })
export class DevisPrevisionnelService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/devis-previsionnels`;

  getAll(params?: { clientId?: number; vehiculeId?: number }): Observable<DevisPrevisionnel[]> {
    const p: Record<string, string> = {};
    if (params?.clientId) p['clientId'] = String(params.clientId);
    if (params?.vehiculeId) p['vehiculeId'] = String(params.vehiculeId);
    return this.http.get<DevisPrevisionnel[]>(this.api, { params: p });
  }

  getById(id: number): Observable<DevisPrevisionnel> {
    return this.http.get<DevisPrevisionnel>(`${this.api}/${id}`);
  }

  create(data: DevisPrevisionnelRequest): Observable<DevisPrevisionnel> {
    return this.http.post<DevisPrevisionnel>(this.api, data);
  }

  update(id: number, data: DevisPrevisionnelRequest): Observable<DevisPrevisionnel> {
    return this.http.put<DevisPrevisionnel>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
