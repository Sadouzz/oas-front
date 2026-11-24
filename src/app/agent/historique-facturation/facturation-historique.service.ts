import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FacturationHistoriqueQueryParams,
  FacturationHistoriqueResponseDto,
} from './models/facturation-historique.model';

export * from './models/facturation-historique.model';

@Injectable({ providedIn: 'root' })
export class FacturationHistoriqueService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/facturation/historique`;

  getHistorique(params: FacturationHistoriqueQueryParams = {}): Observable<FacturationHistoriqueResponseDto> {
    const query: Record<string, string> = {};
    if (params.type && params.type !== 'ALL') query['type'] = params.type;
    if (params.date) query['date'] = params.date;
    if (params.dateDebut) query['dateDebut'] = params.dateDebut;
    if (params.dateFin) query['dateFin'] = params.dateFin;
    if (params.clientId !== undefined && params.clientId !== null) query['clientId'] = String(params.clientId);
    if (params.clientNumero?.trim()) query['clientNumero'] = params.clientNumero.trim();
    if (params.keyword?.trim()) query['keyword'] = params.keyword.trim();
    if (params.page !== undefined) query['page'] = String(params.page);
    if (params.size !== undefined) query['size'] = String(params.size);
    return this.http.get<FacturationHistoriqueResponseDto>(this.api, { params: query });
  }
}
