import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FicheAtelierRequest, FicheAtelierResponse } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class FicheAtelierService {
  private apiUrl = 'http://localhost:9090/api/admin/fiches-atelier';

  constructor(private http: HttpClient) { }

  getAll(): Observable<FicheAtelierResponse[]> {
    return this.http.get<FicheAtelierResponse[]>(this.apiUrl);
  }

  getById(id: number): Observable<FicheAtelierResponse> {
    return this.http.get<FicheAtelierResponse>(`${this.apiUrl}/${id}`);
  }

  getByRendezVousId(rendezVousId: number): Observable<FicheAtelierResponse> {
    return this.http.get<FicheAtelierResponse>(`${this.apiUrl}/rendezvous/${rendezVousId}`);
  }

  create(request: FicheAtelierRequest): Observable<FicheAtelierResponse> {
    return this.http.post<FicheAtelierResponse>(this.apiUrl, request);
  }

  update(id: number, request: FicheAtelierRequest): Observable<FicheAtelierResponse> {
    return this.http.put<FicheAtelierResponse>(`${this.apiUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  signForExit(id: number, signature: string): Observable<FicheAtelierResponse> {
    return this.http.patch<FicheAtelierResponse>(`${this.apiUrl}/${id}/signature-sortie`, { signature });
  }
}
