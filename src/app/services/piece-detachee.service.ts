import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AlerteStock, PieceDetache, PieceDetacheRequest } from '../shared/models';

export type { AlerteStock, PieceDetache, PieceDetacheRequest };

@Injectable({ providedIn: 'root' })
export class PieceDetacheeService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/pieces-detachees`;

  getAll(params?: { keyword?: string; statut?: string; type?: string }): Observable<PieceDetache[]> {
    const p: Record<string, string> = {};
    if (params?.keyword) p['keyword'] = params.keyword;
    if (params?.statut) p['statut'] = params.statut;
    if (params?.type) p['type'] = params.type;
    return this.http.get<PieceDetache[]>(this.api, { params: p });
  }

  getById(id: number): Observable<PieceDetache> {
    return this.http.get<PieceDetache>(`${this.api}/${id}`);
  }

  create(data: PieceDetacheRequest): Observable<PieceDetache> {
    return this.http.post<PieceDetache>(`${this.api}/create`, data);
  }

  update(id: number, data: PieceDetacheRequest): Observable<PieceDetache> {
    return this.http.put<PieceDetache>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }
}
