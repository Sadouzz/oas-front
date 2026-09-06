import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DevisPrevisionnel, DevisPrevisionnelRequest, PageParams, PageResponse } from '../../shared/models';

export type { DevisPrevisionnel, DevisPrevisionnelRequest };

@Injectable({ providedIn: 'root' })
export class DevisPrevisionnelService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/devis-previsionnels`;

  getAll(params: PageParams & { clientId?: number; vehiculeId?: number; keyword?: string } = {}): Observable<PageResponse<DevisPrevisionnel> | DevisPrevisionnel[]> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    if (params.clientId) httpParams = httpParams.set('clientId', params.clientId.toString());
    if (params.vehiculeId) httpParams = httpParams.set('vehiculeId', params.vehiculeId.toString());
    return this.http.get<PageResponse<DevisPrevisionnel> | DevisPrevisionnel[]>(this.api, { params: httpParams });
  }

  getById(id: number): Observable<DevisPrevisionnel> {
    return this.http.get<DevisPrevisionnel>(`${this.api}/${id}`);
  }

  create(data: DevisPrevisionnelRequest): Observable<DevisPrevisionnel> {
    return this.http.post<DevisPrevisionnel>(this.api, data);
  }

  update(id: number, data: DevisPrevisionnelRequest): Observable<DevisPrevisionnel> {
    return this.http.put<DevisPrevisionnel>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  getByFicheAtelierId(ficheAtelierId: number): Observable<DevisPrevisionnel | null> {
    return this.http.get<DevisPrevisionnel | null>(`${this.api}/fiche-atelier/${ficheAtelierId}`);
  }

  valider(id: number): Observable<DevisPrevisionnel> {
    return this.http.put<DevisPrevisionnel>(`${this.api}/${id}/valider`, {});
  }
}
