import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientModel, ClientListResponse, CreateClientPayload, UpdateClientPayload } from './models/client-model';
import { PageParams } from '../../shared/models';

export type UserModel = ClientListResponse;
export type UserUpdatePayload = UpdateClientPayload;
export type { ClientModel, ClientListResponse, CreateClientPayload, UpdateClientPayload };

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/clients`;

  getAll(params: PageParams = {}): Observable<ClientListResponse[]> {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams['page'] = params.page.toString();
    if (params.size !== undefined) queryParams['size'] = params.size.toString();
    if (params.keyword) queryParams['keyword'] = params.keyword;
    return this.http.get<ClientListResponse[]>(this.api, { params: queryParams });
  }

  getRecent(): Observable<ClientListResponse[]> {
    return this.http.get<ClientListResponse[]>(`${this.api}/recent`);
  }

  getById(id: number): Observable<ClientModel> {
    return this.http.get<ClientModel>(`${this.api}/${id}`);
  }

  create(data: CreateClientPayload): Observable<any> {
    return this.http.post(`${this.api}/create`, data, { responseType: 'text' as 'json' });
  }

  update(id: number, data: UpdateClientPayload): Observable<ClientModel> {
    return this.http.put<ClientModel>(`${this.api}/${id}`, data);
  }

  archive(id: number): Observable<any> {
    return this.http.patch(`${this.api}/${id}/archive`, {}, { responseType: 'text' as 'json' });
  }

  unarchive(id: number): Observable<any> {
    return this.http.patch(`${this.api}/${id}/unarchive`, {}, { responseType: 'text' as 'json' });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}`, { responseType: 'text' as 'json' });
  }
}
