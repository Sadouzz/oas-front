import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RendezVous, RendezVousStatus, PageResponse, PageParams, CreateRendezVousRequest } from '../../shared/models';

export type { RendezVous, RendezVousStatus, CreateRendezVousRequest };

@Injectable({ providedIn: 'root' })
export class RendezVousService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/rendez-vous`;

  getAll(params: PageParams & { keyword?: string; statut?: RendezVousStatus | string } = {}): Observable<PageResponse<RendezVous> | RendezVous[]> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    if (params.statut) httpParams = httpParams.set('statut', params.statut);
    return this.http.get<PageResponse<RendezVous> | RendezVous[]>(this.api, { params: httpParams });
  }

  getById(id: number): Observable<RendezVous> {
    return this.http.get<RendezVous>(`${this.api}/${id}`);
  }

  create(payload: CreateRendezVousRequest): Observable<RendezVous> {
    return this.http.post<RendezVous>(this.api, payload);
  }

  updateStatut(id: number, statut: RendezVousStatus, commentaire?: string): Observable<RendezVous> {
    let params = new HttpParams().set('statut', statut);
    if (commentaire) params = params.set('commentaire', commentaire);
    return this.http.put<RendezVous>(`${this.api}/${id}/statut`, null, { params });
  }

  valider(id: number, mecanicienIds: number[] = []): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${this.api}/${id}/valider`, mecanicienIds);
  }

  updateDate(id: number, nouvelleDate: string): Observable<RendezVous> {
    return this.http.put<RendezVous>(`${this.api}/${id}/date`, { nouvelleDate });
  }
}

