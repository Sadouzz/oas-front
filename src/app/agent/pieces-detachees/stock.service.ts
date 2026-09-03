import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlerteStock, InventaireResponse, PieceMouvementListResponse, PageResponse } from '../../shared/models';

export type { AlerteStock, InventaireResponse, PieceMouvementListResponse };

@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/stock`;

  entree(pieceId: number, quantite: number, motif: string): Observable<PieceMouvementListResponse> {
    return this.http.post<PieceMouvementListResponse>(`${this.api}/entree`, { pieceId, quantite, motif });
  }

  sortie(pieceId: number, quantite: number, motif: string): Observable<PieceMouvementListResponse> {
    return this.http.post<PieceMouvementListResponse>(`${this.api}/sortie`, { pieceId, quantite, motif });
  }

  ajustement(pieceId: number, stockMagasin: number, stockAtelier: number, motif: string): Observable<PieceMouvementListResponse> {
    return this.http.post<PieceMouvementListResponse>(`${this.api}/ajustement`, { pieceId, stockMagasin, stockAtelier, motif });
  }

  inventaire(
    pieceId: number,
    stockMagasinPhysique: number,
    stockAtelierPhysique: number,
    motif: string
  ): Observable<InventaireResponse> {
    return this.http.post<InventaireResponse>(`${this.api}/inventaire`, {
      pieceId,
      stockMagasinPhysique,
      stockAtelierPhysique,
      motif,
    });
  }

  historiquePiece(pieceId: number, type?: string, page?: number, size?: number): Observable<PageResponse<PieceMouvementListResponse> | PieceMouvementListResponse[]> {
    const params: Record<string, string> = {};
    if (type) params['type'] = type;
    if (page !== undefined) params['page'] = page.toString();
    if (size !== undefined) params['size'] = size.toString();
    return this.http.get<PageResponse<PieceMouvementListResponse> | PieceMouvementListResponse[]>(`${this.api}/historique/${pieceId}`, { params });
  }

  historiqueGlobal(
    debut?: string,
    fin?: string,
    pieceId?: number,
    categorie?: string,
    type?: string,
    page?: number,
    size?: number
  ): Observable<PageResponse<PieceMouvementListResponse> | PieceMouvementListResponse[]> {
    const params: Record<string, string> = {};
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
}
