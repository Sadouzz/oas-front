import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VehiculeModel, VehiculeRequest } from '../../shared/models';

export type { VehiculeModel, VehiculeRequest };

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

  getByClient(clientId: number): Observable<VehiculeModel[]> {
    return this.http.get<VehiculeModel[]>(`${this.api}/client/${clientId}`);
  }

  create(data: VehiculeRequest): Observable<VehiculeModel> {
    return this.http.post<VehiculeModel>(`${this.api}/create`, data);
  }

  update(id: number, data: VehiculeRequest): Observable<VehiculeModel> {
    return this.http.put<VehiculeModel>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }
}
