import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Proforma } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ClientProformaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/proformas`;

  getAll(): Observable<Proforma[]> {
    return this.http.get<Proforma[]>(this.api + '/me');
  }

  valider(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/client-valider`, {});
  }

  refuser(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/client-refuser`, {});
  }
}
