import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FactureModel, FactureListModel } from '../../agent/factures/models/facture.model';

@Injectable({ providedIn: 'root' })
export class ClientFactureService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/factures`;

  getAll(): Observable<FactureListModel[]> {
    return this.http.get<FactureListModel[]>(this.api + '/me');
  }

  getById(id: number): Observable<FactureModel> {
    return this.http.get<FactureModel>(`${this.api}/me/${id}`);
  }

  downloadPdf(id: number, layoutKey: 'AVEC_ENTETE' | 'SANS_ENTETE'): Observable<Blob> {
    return this.http.get(`${this.api}/me/${id}/pdf`, { params: { layoutKey }, responseType: 'blob' });
  }
}
