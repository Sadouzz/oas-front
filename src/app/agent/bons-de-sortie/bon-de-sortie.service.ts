import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BonDeSortie, BonDeSortieRequest, LigneBonDeSortie } from '../../shared/models';

export interface BonDeSortieHistorique {
  id: number;
  statut?: string;
  action?: string;
  motif?: string;
  dateAction: string;
  prenom?: string;
  nom?: string;
  numBs?: string;
  numeroSerie?: string;
  immatriculation?: string;
  designation?: string;
  bonDeSortieId?: number;
  bonDeSortie?: BonDeSortie;
  piece?: {
    id: number;
    reference: string;
    designation?: string;
  };
  quantite?: number;
  stockMagasin?: number;
  stockAtelier?: number;
  qteReelle?: number;
  agent?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export type { BonDeSortie, BonDeSortieRequest, LigneBonDeSortie };

@Injectable({ providedIn: 'root' })
export class BonDeSortieService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/bons-de-sortie`;

  getAll(params?: import('../../shared/models').PageParams & { statut?: string; clientId?: number; vehiculeId?: number }): Observable<BonDeSortie[]> {
    const p: Record<string, string> = {};
    if (params?.statut) p['statut'] = params.statut;
    if (params?.clientId) p['clientId'] = String(params.clientId);
    if (params?.vehiculeId) p['vehiculeId'] = String(params.vehiculeId);
    if (params?.page !== undefined) p['page'] = params.page.toString();
    if (params?.size !== undefined) p['size'] = params.size.toString();
    if (params?.keyword) p['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: p });
  }

  getById(id: number): Observable<BonDeSortie> {
    return this.http.get<BonDeSortie>(`${this.api}/${id}`);
  }

  creer(data: BonDeSortieRequest): Observable<BonDeSortie> {
    return this.http.post<BonDeSortie>(`${this.api}/creer`, {
      clientId: data.clientId,
      vehiculeId: data.vehiculeId,
      ordreReparationId: data.ordreReparationId,
      lignesPieces: data.lignesPieces,
      remarque: data.remarque,
    });
  }

  valider(id: number): Observable<BonDeSortie> {
    return this.http.put<BonDeSortie>(`${this.api}/${id}/valider`, {});
  }

  retournerPiece(bonId: number, pieceId: number): Observable<BonDeSortie> {
    return this.http.put<BonDeSortie>(`${this.api}/${bonId}/retour-piece/${pieceId}`, {});
  }

  getHistorique(bonId: number, params?: import('../../shared/models').PageParams): Observable<any> {
    const p: Record<string, string> = {};
    if (params?.page !== undefined) p['page'] = params.page.toString();
    if (params?.size !== undefined) p['size'] = params.size.toString();
    return this.http.get<any>(`${this.api}/${bonId}/historique`, { params: p });
  }

  getHistoriqueGlobal(params?: import('../../shared/models').PageParams): Observable<any> {
    const p: Record<string, string> = {};
    if (params?.page !== undefined) p['page'] = params.page.toString();
    if (params?.size !== undefined) p['size'] = params.size.toString();
    if (params?.keyword) p['keyword'] = params.keyword;
    return this.http.get<any>(`${this.api}/historique-global`, { params: p });
  }
}
