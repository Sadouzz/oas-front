import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FactureModel } from '../shared/models/facture.model';

export type { FactureModel };

@Injectable({ providedIn: 'root' })
export class FactureService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/factures`;

  getAll(): Observable<FactureModel[]> {
    return this.http.get<FactureModel[]>(this.api);
  }
}
