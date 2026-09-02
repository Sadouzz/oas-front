import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlerteStock, InventaireResponse, StockMouvement } from '../../shared/models';

export type { AlerteStock, InventaireResponse, StockMouvement };

@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/stock`;
  private invApi = `${environment.apiUrl}/api/inventaire`;

  entree(pieceId: number, quantite: number, motif: string): Observable<StockMouvement> {
    return this.http.post<StockMouvement>(`${this.api}/entree`, { pieceId, quantite, motif });
  }

  sortie(pieceId: number, quantite: number, motif: string): Observable<StockMouvement> {
    return this.http.post<StockMouvement>(`${this.api}/sortie`, { pieceId, quantite, motif });
  }

  ajustement(pieceId: number, stockMagasin: number, stockAtelier: number, motif: string): Observable<StockMouvement> {
    return this.http.post<StockMouvement>(`${this.api}/ajustement`, { pieceId, stockMagasin, stockAtelier, motif });
  }

  historiquePiece(pieceId: number, type?: string): Observable<StockMouvement[]> {
    const params: Record<string, string> = {};
    if (type) params['type'] = type;
    return this.http.get<StockMouvement[]>(`${this.api}/historique/${pieceId}`, { params });
  }

  historiqueGlobal(debut?: string, fin?: string, pieceId?: number, categorie?: string, type?: string): Observable<StockMouvement[]> {
    const params: Record<string, string> = {};
    if (debut) params['debut'] = debut;
    if (fin) params['fin'] = fin;
    if (pieceId) params['pieceId'] = pieceId.toString();
    if (categorie) params['categorie'] = categorie;
    if (type) params['type'] = type;
    return this.http.get<StockMouvement[]>(`${this.api}/historique`, { params });
  }

  alertes(): Observable<AlerteStock[]> {
    return this.http.get<AlerteStock[]>(`${this.api}/alertes`);
  }

  ruptures(): Observable<AlerteStock[]> {
    return this.http.get<AlerteStock[]>(`${this.api}/alertes/ruptures`);
  }

  stocksFaibles(): Observable<AlerteStock[]> {
    return this.http.get<AlerteStock[]>(`${this.api}/alertes/stocks-faibles`);
  }

  inventaire(pieceId: number, stockMagasinPhysique: number, stockAtelierPhysique: number, motif: string): Observable<InventaireResponse> {
    return this.http.post<InventaireResponse>(`${this.invApi}/compter`, {
      pieceId, stockMagasinPhysique, stockAtelierPhysique, motif
    });
  }
}
