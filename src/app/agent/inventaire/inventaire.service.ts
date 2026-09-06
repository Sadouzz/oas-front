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
}
