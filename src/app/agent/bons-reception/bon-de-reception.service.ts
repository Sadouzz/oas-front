import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BonDeReception, BonDeReceptionRequest } from './models/bon-de-reception.model';

@Injectable({ providedIn: 'root' })
export class BonDeReceptionService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/bons-de-reception`;

  getAll(params: import('../../shared/models').PageParams = {}): Observable<any> {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams['page'] = params.page.toString();
    if (params.size !== undefined) queryParams['size'] = params.size.toString();
    if (params.keyword) queryParams['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: queryParams });
  }

  getById(id: number): Observable<BonDeReception> {
    return this.http.get<BonDeReception>(`${this.api}/${id}`);
  }

  recent(): Observable<BonDeReception[]> {
    return this.http.get<BonDeReception[]>(`${this.api}/recent`);
  }

  create(data: BonDeReceptionRequest): Observable<BonDeReception> {
    return this.http.post<BonDeReception>(this.api, data);
  }

  update(id: number, data: BonDeReceptionRequest): Observable<BonDeReception> {
    return this.http.put<BonDeReception>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
