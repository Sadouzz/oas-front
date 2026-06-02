import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BonDeCommandeCreateRequest,
  BonDeCommandeResponse,
} from '../models/bon-de-commande.model';

@Injectable({ providedIn: 'root' })
export class BonDeCommandeService {
  private api = 'http://localhost:9090/api/bons-de-commande';

  constructor(private http: HttpClient) {}

  getAll(params?: { statut?: string }): Observable<BonDeCommandeResponse[]> {
    const p: Record<string, string> = {};
    if (params?.statut) p['statut'] = params.statut;
    return this.http.get<BonDeCommandeResponse[]>(this.api, { params: p });
  }

  getById(id: number): Observable<BonDeCommandeResponse> {
    return this.http.get<BonDeCommandeResponse>(`${this.api}/${id}`);
  }

  create(data: BonDeCommandeCreateRequest): Observable<BonDeCommandeResponse> {
    return this.http.post<BonDeCommandeResponse>(this.api, data);
  }

  update(id: number, data: BonDeCommandeCreateRequest): Observable<BonDeCommandeResponse> {
    return this.http.put<BonDeCommandeResponse>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  search(keyword: string): Observable<BonDeCommandeResponse[]> {
    return this.http.get<BonDeCommandeResponse[]>(`${this.api}/search`, { params: { keyword } });
  }

  getRecent(): Observable<BonDeCommandeResponse[]> {
    return this.http.get<BonDeCommandeResponse[]>(`${this.api}/recent`);
  }

  envoyer(id: number): Observable<BonDeCommandeResponse> {
    return this.http.post<BonDeCommandeResponse>(`${this.api}/${id}/envoyer`, {});
  }

  receptionner(id: number): Observable<BonDeCommandeResponse> {
    return this.http.post<BonDeCommandeResponse>(`${this.api}/${id}/receptionner`, {});
  }

  annuler(id: number): Observable<BonDeCommandeResponse> {
    return this.http.post<BonDeCommandeResponse>(`${this.api}/${id}/annuler`, {});
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
