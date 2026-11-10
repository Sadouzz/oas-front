import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BonDeSortie, BonDeSortieRequest, LigneBonDeSortie, PageParams } from '../../shared/models';
import { BonDeSortieHistorique } from './models/bon-de-sortie.model';

export type { BonDeSortie, BonDeSortieRequest, LigneBonDeSortie, BonDeSortieHistorique };


@Injectable({ providedIn: 'root' })
export class BonDeSortieService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/bons-de-sortie`;

  getAll(params?: PageParams & { statut?: string; clientId?: number; vehiculeId?: number; ordreReparationId?: number; ordreTravailId?: number }): Observable<BonDeSortie[]> {
    const p: Record<string, string> = {};
    if (params?.statut) p['statut'] = params.statut;
    if (params?.clientId) p['clientId'] = String(params.clientId);
    if (params?.vehiculeId) p['vehiculeId'] = String(params.vehiculeId);
    if (params?.ordreReparationId) p['ordreReparationId'] = String(params.ordreReparationId);
    if (params?.ordreTravailId) p['ordreTravailId'] = String(params.ordreTravailId);
    if (params?.page !== undefined) p['page'] = params.page.toString();
    if (params?.size !== undefined) p['size'] = params.size.toString();
    if (params?.keyword) p['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: p });
  }

  getById(id: number): Observable<BonDeSortie> {
    return this.http.get<any>(`${this.api}/${id}`).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  creer(data: BonDeSortieRequest): Observable<BonDeSortie> {
    return this.http.post<any>(`${this.api}/creer`, {
      clientId: data.clientId,
      vehiculeId: data.vehiculeId,
      ordreReparationId: data.ordreReparationId,
      ordreTravailId: data.ordreTravailId,
      lignesPieces: data.lignesPieces,
      lignesMainDoeuvres: data.lignesMainDoeuvres,
      remarque: data.remarque,
    }).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  update(id: number, data: BonDeSortieRequest): Observable<BonDeSortie> {
    return this.http.put<any>(`${this.api}/${id}`, {
      clientId: data.clientId,
      vehiculeId: data.vehiculeId,
      ordreReparationId: data.ordreReparationId,
      ordreTravailId: data.ordreTravailId,
      lignesPieces: data.lignesPieces,
      lignesMainDoeuvres: data.lignesMainDoeuvres,
      remarque: data.remarque,
    }).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  valider(id: number): Observable<BonDeSortie> {
    return this.http.put<any>(`${this.api}/${id}/valider`, {}).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  retournerPiece(bonId: number, pieceId: number): Observable<BonDeSortie> {
    return this.http.put<any>(`${this.api}/${bonId}/retour-piece/${pieceId}`, {}).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
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
