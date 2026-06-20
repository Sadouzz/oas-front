import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RecuModel, RecuRequest } from '../shared/models/recu.model';

@Injectable({
  providedIn: 'root'
})
export class RecuService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/recus`;

  create(request: RecuRequest): Observable<RecuModel> {
    return this.http.post<RecuModel>(this.apiUrl, request);
  }

  getByFacture(factureId: number): Observable<RecuModel[]> {
    return this.http.get<RecuModel[]>(`${this.apiUrl}/facture/${factureId}`);
  }

  getAll(): Observable<RecuModel[]> {
    return this.http.get<RecuModel[]>(`${environment.apiUrl}/api/admin/portal/recus`);
  }
}
