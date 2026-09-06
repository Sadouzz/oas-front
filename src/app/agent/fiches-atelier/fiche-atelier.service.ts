import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FicheAtelierRequest, FicheAtelierDetailsResponse, PageParams, PageResponse } from '../../shared/models';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root'
})
export class FicheAtelierService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/fiches-atelier`;

  getAll(params: PageParams & { keyword?: string } = {}): Observable<PageResponse<FicheAtelierDetailsResponse> | FicheAtelierDetailsResponse[]> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    return this.http.get<PageResponse<FicheAtelierDetailsResponse> | FicheAtelierDetailsResponse[]>(this.api, { params: httpParams });
  }

  getById(id: number): Observable<FicheAtelierDetailsResponse> {
    return this.http.get<FicheAtelierDetailsResponse>(`${this.api}/${id}`);
  }

  getByRendezVousId(rendezVousId: number): Observable<FicheAtelierDetailsResponse> {
    return this.http.get<FicheAtelierDetailsResponse>(`${this.api}/rendezvous/${rendezVousId}`);
  }

  create(request: FicheAtelierRequest): Observable<FicheAtelierDetailsResponse> {
    return this.http.post<FicheAtelierDetailsResponse>(this.api, request);
  }

  update(id: number, request: FicheAtelierRequest): Observable<FicheAtelierDetailsResponse> {
    return this.http.put<FicheAtelierDetailsResponse>(`${this.api}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  signForExit(id: number, signature: string): Observable<FicheAtelierDetailsResponse> {
    return this.http.patch<FicheAtelierDetailsResponse>(`${this.api}/${id}/signature-sortie`, { signature });
  }
}
