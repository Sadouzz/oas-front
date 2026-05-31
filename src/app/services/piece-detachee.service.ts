import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PieceDetache {
  id: number;
  type: 'PDP' | 'PDG' | 'PDS';
  numeroDeSerie: string;
  reference: string;
  categorie: string;
  pourcentage: number;
  statut: 'ACTIF' | 'INACTIF';
  createdAt: string;
  // PDP uniquement
  qteReelle?: number;
  stockAtelier?: number;
  stockMagasin?: number;
  prix?: number;
  seuilMinimum?: number;
}

export interface PieceDetacheRequest {
  type: 'PDP' | 'PDG' | 'PDS';
  numeroDeSerie: string;
  reference: string;
  categorie: string;
  pourcentage: number;
  statut?: 'ACTIF' | 'INACTIF';
  stockMagasin?: number | null;
  prix?: number | null;
  seuilMinimum?: number | null;
}

export interface AlerteStock {
  pieceId: number;
  numeroDeSerie: string;
  reference: string;
  categorie: string;
  stockMagasin: number;
  stockAtelier: number;
  qteReelle: number;
  seuilApplique: number;
  typeAlerte: 'RUPTURE' | 'STOCK_FAIBLE';
}

@Injectable({ providedIn: 'root' })
export class PieceDetacheeService {
  private api = 'http://localhost:9090/api/pieces-detachees';

  constructor(private http: HttpClient) {}

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
