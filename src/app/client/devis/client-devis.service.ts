import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DevisPrevisionnel } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientDevisService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/devis-previsionnels`;

  getAll(): Observable<DevisPrevisionnel[]> {
    return this.http.get<DevisPrevisionnel[]>(this.api + '/me');
  }

  getById(id: number): Observable<DevisPrevisionnel> {
    return this.http.get<DevisPrevisionnel>(`${this.api}/me/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/me/${id}/pdf`, { responseType: 'blob' });
  }

  accepter(id: number): Observable<DevisPrevisionnel> {
    return this.http.put<DevisPrevisionnel>(`${this.api}/${id}/client-accepter`, {});
  }

  refuser(id: number): Observable<DevisPrevisionnel> {
    return this.http.put<DevisPrevisionnel>(`${this.api}/${id}/client-refuser`, {});
  }
}
