import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proforma } from '../../agent/proforma/proforma.service';

export type { Proforma };

@Injectable({ providedIn: 'root' })
export class ClientProformaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/proformas`;

  getAll(): Observable<Proforma[]> {
    return this.http.get<Proforma[]>(this.api);
  }

  valider(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/valider`, {});
  }

  refuser(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/refuser`, {});
  }
}
