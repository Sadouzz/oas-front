import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FactureModel, FactureCreateRequest } from '../shared/models/facture.model';

export type { FactureModel, FactureCreateRequest };

@Injectable({ providedIn: 'root' })
export class FactureService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/factures`;

  getAll(): Observable<FactureModel[]> {
    return this.http.get<FactureModel[]>(this.api);
  }

  getById(id: number): Observable<FactureModel> {
    return this.http.get<FactureModel>(`${this.api}/${id}`);
  }

  search(keyword: string): Observable<FactureModel[]> {
    return this.http.get<FactureModel[]>(`${this.api}/search`, { params: { keyword } });
  }

  recent(): Observable<FactureModel[]> {
    return this.http.get<FactureModel[]>(`${this.api}/recent`);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  create(data: FactureCreateRequest): Observable<FactureModel> {
    return this.http.post<FactureModel>(`${this.api}/creer`, data);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
