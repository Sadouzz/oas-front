import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AvoirTvaAcheteeRequest,
  AvoirTvaAcheteeResponse,
  FactureAcheteeRequest,
  FactureAcheteeResponse,
  TvaDeclarationResponseDto,
  TvaRapportUpdateRequest,
} from './models/tva.model';

export * from './models/tva.model';

@Injectable({ providedIn: 'root' })
export class TvaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api`;

  getDeclaration(params: {
    month?: string;
    pageVendu?: number;
    pageAvoirVendu?: number;
    pageAchete?: number;
    pageAvoirAchete?: number;
    size?: number;
  } = {}): Observable<TvaDeclarationResponseDto> {
    const query: Record<string, string> = {};
    if (params.month) query['month'] = params.month;
    if (params.pageVendu !== undefined) query['pageVendu'] = String(params.pageVendu);
    if (params.pageAvoirVendu !== undefined) query['pageAvoirVendu'] = String(params.pageAvoirVendu);
    if (params.pageAchete !== undefined) query['pageAchete'] = String(params.pageAchete);
    if (params.pageAvoirAchete !== undefined) query['pageAvoirAchete'] = String(params.pageAvoirAchete);
    if (params.size !== undefined) query['size'] = String(params.size);
    return this.http.get<TvaDeclarationResponseDto>(`${this.api}/tva/declaration`, { params: query });
  }

  downloadPdf(month?: string): Observable<Blob> {
    const params: Record<string, string> = month ? { month } : {};
    return this.http.get(`${this.api}/tva/declaration/pdf`, {
      params,
      responseType: 'blob',
    });
  }

  addFactureAchetee(payload: FactureAcheteeRequest): Observable<FactureAcheteeResponse> {
    return this.http.post<FactureAcheteeResponse>(`${this.api}/factures-achetees`, payload);
  }

  deleteFactureAchetee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/factures-achetees/${id}`);
  }

  addAvoirTvaAchetee(payload: AvoirTvaAcheteeRequest): Observable<AvoirTvaAcheteeResponse> {
    return this.http.post<AvoirTvaAcheteeResponse>(`${this.api}/avoirs-tva-achetee`, payload);
  }

  deleteAvoirTvaAchetee(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/avoirs-tva-achetee/${id}`);
  }

  updateRapport(payload: TvaRapportUpdateRequest): Observable<any> {
    return this.http.put<any>(`${this.api}/tva/rapport`, payload);
  }
}
