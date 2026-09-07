import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proforma, ProformaRequest } from './models/proforma.model';
import { PageParams } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ProformaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/proformas`;

  getAll(params?: PageParams): Observable<Proforma[]> {
    const p: Record<string, string> = {};
    if (params?.page !== undefined) p['page'] = params.page.toString();
    if (params?.size !== undefined) p['size'] = params.size.toString();
    if (params?.keyword) p['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: p });
  }

  getById(id: number): Observable<Proforma> {
    return this.http.get<Proforma>(`${this.api}/${id}`);
  }

  getByOrdreReparationId(ordreReparationId: number): Observable<Proforma> {
    return this.http.get<Proforma>(`${this.api}/ordre-reparation/${ordreReparationId}`);
  }

  search(keyword: string): Observable<Proforma[]> {
    return this.http.get<Proforma[]>(`${this.api}/search`, { params: { keyword } });
  }

  recent(): Observable<Proforma[]> {
    return this.http.get<Proforma[]>(`${this.api}/recent`);
  }

  create(data: ProformaRequest): Observable<Proforma> {
    return this.http.post<Proforma>(this.api, data);
  }

  update(id: number, data: ProformaRequest): Observable<Proforma> {
    return this.http.put<Proforma>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  valider(id: number): Observable<Proforma> {
    return this.http.put<Proforma>(`${this.api}/${id}/valider`, {});
  }

  /** Validation des prix par le chef d'atelier + envoi/visibilité au client (cf. spec point 7). */
  validerEnvoi(id: number): Observable<Proforma> {
    return this.http.post<Proforma>(`${this.api}/${id}/valider-envoi`, {});
  }

  convertToFacture(id: number): Observable<any> {
    return this.http.post<any>(`${this.api}/${id}/convert`, {});
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
