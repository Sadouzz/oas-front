import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AlerteStock } from './piece-detachee.service';

export interface StockMouvement {
  id: number;
  type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT' | 'INVENTAIRE';
  quantite: number;
  stockMagasinAvant: number;
  stockAtelierAvant: number;
  stockMagasinApres: number;
  stockAtelierApres: number;
  motif: string;
  dateOperation: string;
  piece: { id: number; reference: string; numeroDeSerie: string } | null;
  agent: { id: number; username: string; firstName: string; lastName: string } | null;
}

export interface InventaireResponse {
  pieceId: number;
  numeroDeSerie: string;
  reference: string;
  stockMagasinTheorique: number;
  stockAtelierTheorique: number;
  stockMagasinPhysique: number;
  stockAtelierPhysique: number;
  ecartMagasin: number;
  ecartAtelier: number;
  ajuste: boolean;
  mouvement: StockMouvement | null;
}

@Injectable({ providedIn: 'root' })
export class StockService {
  private api = 'http://localhost:9090/api/stock';
  private invApi = 'http://localhost:9090/api/inventaire';

  constructor(private http: HttpClient) {}

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

  historiqueGlobal(debut: string, fin: string): Observable<StockMouvement[]> {
    return this.http.get<StockMouvement[]>(`${this.api}/historique`, {
      params: { debut, fin }
    });
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
