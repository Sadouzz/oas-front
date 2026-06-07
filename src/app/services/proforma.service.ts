import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DevisPrevisionnelRequest, ProformaResponse } from '../models/proforma.model';

@Injectable({ providedIn: 'root' })
export class ProformaService {
  private api = 'http://localhost:9090/api/devis-previsionnels';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ProformaResponse[]> { return this.http.get<ProformaResponse[]>(this.api); }
  getById(id: number): Observable<ProformaResponse> { return this.http.get<ProformaResponse>(`${this.api}/${id}`); }
  create(data: DevisPrevisionnelRequest): Observable<ProformaResponse> { return this.http.post<ProformaResponse>(this.api, data); }
  update(id: number, data: DevisPrevisionnelRequest): Observable<ProformaResponse> { return this.http.put<ProformaResponse>(`${this.api}/${id}`, data); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/${id}`); }
  downloadPdf(id: number): Observable<Blob> { return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' as 'blob' }); }
}
