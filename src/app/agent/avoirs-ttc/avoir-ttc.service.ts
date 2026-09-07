import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AvoirTTC, AvoirTTCCreateRequest } from './models/avoit-ttc.model';
import { PageParams } from '../../shared/models';

export type { AvoirTTC, AvoirTTCCreateRequest };


@Injectable({ providedIn: 'root' })
export class AvoirTTCService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/avoirs-ttc`;

  getAll(params: PageParams = {}): Observable<AvoirTTC[]> {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams['page'] = params.page.toString();
    if (params.size !== undefined) queryParams['size'] = params.size.toString();
    if (params.keyword) queryParams['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: queryParams });
  }

  getById(id: number): Observable<AvoirTTC> {
    return this.http.get<AvoirTTC>(`${this.api}/${id}`);
  }

  create(data: AvoirTTCCreateRequest): Observable<AvoirTTC> {
    return this.http.post<AvoirTTC>(this.api, data);
  }

  search(keyword: string): Observable<AvoirTTC[]> {
    return this.http.get<AvoirTTC[]>(`${this.api}/search`, { params: { keyword } });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
