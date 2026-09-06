import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlerteStockResponse, PageResponse } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AlerteService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/alertes`;

  getAlertes(page: number = 0, size: number = 10): Observable<PageResponse<AlerteStockResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponse<AlerteStockResponse>>(this.api, { params });
  }

  getRuptures(page: number = 0, size: number = 10): Observable<PageResponse<AlerteStockResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponse<AlerteStockResponse>>(`${this.api}/ruptures`, { params });
  }

  getStocksFaibles(page: number = 0, size: number = 10): Observable<PageResponse<AlerteStockResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<PageResponse<AlerteStockResponse>>(`${this.api}/stocks-faibles`, { params });
  }
}
