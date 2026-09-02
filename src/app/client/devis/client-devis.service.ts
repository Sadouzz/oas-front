import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DevisPrevisionnel } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientDevisService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/devis-previsionnels`;

  getAll(): Observable<DevisPrevisionnel[]> {
    return this.http.get<DevisPrevisionnel[]>(this.api);
  }

  accepter(id: number): Observable<DevisPrevisionnel> {
    return this.http.put<DevisPrevisionnel>(`${this.api}/${id}/accepter`, {});
  }

  refuser(id: number): Observable<DevisPrevisionnel> {
    return this.http.put<DevisPrevisionnel>(`${this.api}/${id}/refuser`, {});
  }
}
