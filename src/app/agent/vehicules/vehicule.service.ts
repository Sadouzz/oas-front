import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TypeHistoriqueVehicule,
  VehiculeHistoriqueItemDto,
  VehiculeHistoriqueQueryParams,
  VehiculeHistoriqueResponseDto,
  VehiculeModel,
  VehiculeRequest,
} from '../../shared/models';

export type {
  TypeHistoriqueVehicule,
  VehiculeHistoriqueItemDto,
  VehiculeHistoriqueQueryParams,
  VehiculeHistoriqueResponseDto,
  VehiculeModel,
  VehiculeRequest,
};

@Injectable({ providedIn: 'root' })
export class VehiculeService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/vehicules`;

  getAll(params: import('../../shared/models').PageParams = {}): Observable<VehiculeModel[]> {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams['page'] = params.page.toString();
    if (params.size !== undefined) queryParams['size'] = params.size.toString();
    if (params.keyword) queryParams['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: queryParams });
  }

  getRecent(): Observable<VehiculeModel[]> {
    return this.http.get<VehiculeModel[]>(`${this.api}/recent`);
  }

  getById(id: number): Observable<VehiculeModel> {
    return this.http.get<VehiculeModel>(`${this.api}/${id}`);
  }

  getHistorique(id: number, params: VehiculeHistoriqueQueryParams = {}): Observable<VehiculeHistoriqueResponseDto> {
    const queryParams: Record<string, string> = {};
    if (params.type && params.type !== 'ALL') queryParams['type'] = params.type;
    if (params.keyword?.trim()) queryParams['keyword'] = params.keyword.trim();
    if (params.dateDebut) queryParams['dateDebut'] = params.dateDebut;
    if (params.dateFin) queryParams['dateFin'] = params.dateFin;
    if (params.page !== undefined) queryParams['page'] = params.page.toString();
    if (params.size !== undefined) queryParams['size'] = params.size.toString();
    return this.http.get<VehiculeHistoriqueResponseDto>(`${this.api}/${id}/historique`, { params: queryParams });
  }

  getByClient(clientId: number): Observable<VehiculeModel[]> {
    return this.http.get<VehiculeModel[]>(`${this.api}/client/${clientId}`);
  }

  getByClientPage(clientId: number, page: number, size = 10): Observable<import('../../shared/models').PageResponse<VehiculeModel>> {
    return this.http.get<import('../../shared/models').PageResponse<VehiculeModel>>(`${this.api}/client/${clientId}`, {
      params: { page: page.toString(), size: size.toString() },
    });
  }

  create(data: VehiculeRequest): Observable<VehiculeModel> {
    return this.http.post<VehiculeModel>(`${this.api}/create`, data);
  }

  activer(id: number): Observable<VehiculeModel> {
    return this.http.put<VehiculeModel>(`${this.api}/${id}/activer`, {});
  }

  update(id: number, data: VehiculeRequest): Observable<VehiculeModel> {
    return this.http.put<VehiculeModel>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }
}
