import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proforma, ProformaRequest } from './models/proforma.model';

@Injectable({ providedIn: 'root' })
export class ProformaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/proformas`;

  getAll(): Observable<Proforma[]> {
    return this.http.get<Proforma[]>(this.api);
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
