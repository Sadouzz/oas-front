import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BonDeSortie, BonDeSortieRequest, LigneBonDeSortie } from '../shared/models';

export type { BonDeSortie, BonDeSortieRequest, LigneBonDeSortie };

@Injectable({ providedIn: 'root' })
export class BonDeSortieService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/bons-de-sortie`;

  getAll(params?: { statut?: string; clientId?: number; vehiculeId?: number }): Observable<BonDeSortie[]> {
    const p: Record<string, string> = {};
    if (params?.statut) p['statut'] = params.statut;
    if (params?.clientId) p['clientId'] = String(params.clientId);
    if (params?.vehiculeId) p['vehiculeId'] = String(params.vehiculeId);
    return this.http.get<BonDeSortie[]>(this.api, { params: p });
  }

  getById(id: number): Observable<BonDeSortie> {
    return this.http.get<BonDeSortie>(`${this.api}/${id}`);
  }

  creer(data: BonDeSortieRequest): Observable<BonDeSortie> {
    return this.http.post<BonDeSortie>(`${this.api}/creer`, {
      clientId: data.clientId,
      vehiculeId: data.vehiculeId,
      lignesPieces: data.lignesPieces,
      lignesMainDoeuvres: data.lignesMainDoeuvres,
      remarque: data.remarque,
    });
  }

  valider(id: number): Observable<BonDeSortie> {
    return this.http.put<BonDeSortie>(`${this.api}/${id}/valider`, {});
  }
}
