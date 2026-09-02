import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FactureModel } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ClientFactureService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/factures`;

  getAll(): Observable<FactureModel[]> {
    return this.http.get<FactureModel[]>(this.api);
  }

  getById(id: number): Observable<FactureModel> {
    return this.http.get<FactureModel>(`${this.api}/${id}`);
  }
}
