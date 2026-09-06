import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AvoirHT, AvoirHTCreateRequest } from './models/avoir-ht.model';
import { PageParams } from '../../shared/models';

export type { AvoirHT, AvoirHTCreateRequest };

@Injectable({ providedIn: 'root' })
export class AvoirHTService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/avoirs-ht`;

  getAll(params: PageParams = {}): Observable<AvoirHT[]> {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams['page'] = params.page.toString();
    if (params.size !== undefined) queryParams['size'] = params.size.toString();
    if (params.keyword) queryParams['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: queryParams });
  }

  getById(id: number): Observable<AvoirHT> {
    return this.http.get<AvoirHT>(`${this.api}/${id}`);
  }

  create(data: AvoirHTCreateRequest): Observable<AvoirHT> {
    return this.http.post<AvoirHT>(this.api, data);
  }

  search(keyword: string): Observable<AvoirHT[]> {
    return this.http.get<AvoirHT[]>(`${this.api}/search`, { params: { keyword } });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
