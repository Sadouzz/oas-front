import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlerteStock, PageParams, PageResponse, PieceDetache, PieceDetacheRequest, PieceMouvementListResponse } from '../../shared/models';

export interface PieceStats {
  totalArticles: number;
  valeurStock: number;
  stockCritique: number;
  ruptures: number;
}

export type { AlerteStock, PieceDetache, PieceDetacheRequest };

@Injectable({ providedIn: 'root' })
export class PieceDetacheeService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/pieces-detachees`;

  getAll(params: PageParams = {}): Observable<PieceDetache[]> {
    const p: Record<string, string> = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        p[key] = params[key].toString();
      }
    });
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

  restore(id: number): Observable<PieceDetache> {
    return this.http.put<PieceDetache>(`${this.api}/${id}/restore`, {});
  }

  historiquePiece(pieceId: number, type?: string, page?: number, size?: number): Observable<PageResponse<PieceMouvementListResponse> | PieceMouvementListResponse[]> {
    const params: Record<string, string> = {};
    if (type) params['type'] = type;
    if (page !== undefined) params['page'] = page.toString();
    if (size !== undefined) params['size'] = size.toString();
    return this.http.get<PageResponse<PieceMouvementListResponse> | PieceMouvementListResponse[]>(`${this.api}/historique/${pieceId}`, { params });
  }

  historiqueGlobal(
    keyword?: string,
    debut?: string,
    fin?: string,
    pieceId?: number,
    categorie?: string,
    type?: string,
    page?: number,
    size?: number
  ): Observable<PageResponse<PieceMouvementListResponse> | PieceMouvementListResponse[]> {
    const params: Record<string, string> = {};
    if (keyword && keyword.trim()) params['keyword'] = keyword.trim();
    if (debut) params['debut'] = debut;
    if (fin) params['fin'] = fin;
    if (pieceId) params['pieceId'] = pieceId.toString();
    if (categorie) params['categorie'] = categorie;
    if (type) params['type'] = type;
    if (page !== undefined) params['page'] = page.toString();
    if (size !== undefined) params['size'] = size.toString();
    return this.http.get<PageResponse<PieceMouvementListResponse> | PieceMouvementListResponse[]>(`${this.api}/historique`, { params });
  }

  alertes(): Observable<AlerteStock[]> {
    return this.http.get<AlerteStock[]>(`${this.api}/alertes`);
  }

  getStats(): Observable<PieceStats> {
    return this.http.get<PieceStats>(`${this.api}/stats`);
  }
}
