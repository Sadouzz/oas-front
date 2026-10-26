import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientModel, ClientListResponse, CreateClientPayload, UpdateClientPayload, FidelePayload, CompteFinancierPayload, CompteFinancierResponse, PortefeuilleClientResponse } from './models/client-model';
import { PageParams } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/clients`;

  getAll(params: PageParams = {}): Observable<ClientListResponse[]> {
    const queryParams: Record<string, string> = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams[key] = params[key].toString();
      }
    });
    return this.http.get<ClientListResponse[]>(this.api, { params: queryParams });
  }

  getRecent(): Observable<ClientListResponse[]> {
    return this.http.get<ClientListResponse[]>(`${this.api}/recent`);
  }

  getArchived(params: PageParams = {}): Observable<ClientListResponse[]> {
    const queryParams: Record<string, string> = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams[key] = params[key].toString();
      }
    });
    return this.http.get<ClientListResponse[]>(`${this.api}/archived`, { params: queryParams });
  }

  getById(id: number): Observable<ClientModel> {
    return this.http.get<ClientModel>(`${this.api}/${id}`);
  }

  create(data: CreateClientPayload): Observable<any> {
    return this.http.post<any>(`${this.api}/create`, data);
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

  passerFidele(id: number, payload: FidelePayload): Observable<ClientModel> {
    return this.http.patch<ClientModel>(`${this.api}/${id}/fidele`, payload);
  }

  retirerFidele(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}/fidele`, { responseType: 'text' as 'json' });
  }

  getCompteFinancier(id: number): Observable<CompteFinancierResponse> {
    return this.http.get<CompteFinancierResponse>(`${this.api}/${id}/compte-financier`);
  }

  configurerCompteFinancier(id: number, payload: CompteFinancierPayload): Observable<CompteFinancierResponse> {
    return this.http.put<CompteFinancierResponse>(`${this.api}/${id}/compte-financier`, payload);
  }

  getPortefeuille(id: number): Observable<PortefeuilleClientResponse> {
    return this.http.get<PortefeuilleClientResponse>(`${this.api}/${id}/portefeuille-prepaye`);
  }

  alimenterPortefeuille(id: number, payload: { montant: number; modePaiement?: string; commentaire?: string }): Observable<PortefeuilleClientResponse> {
    return this.http.post<PortefeuilleClientResponse>(`${this.api}/${id}/portefeuille-prepaye/alimentations`, payload);
  }

  configurerRemise(id: number, montantRemise: number): Observable<ClientListResponse> {
    return this.http.put<ClientListResponse>(`${this.api}/${id}/remise`, { montantRemise });
  }

  updateConditionsFinancieres(id: number, payload: { echeanceJours: number | null; plafondPeriode: number | null }): Observable<ClientModel> {
    return this.http.put<ClientModel>(`${this.api}/${id}/conditions-financieres`, payload);
  }
}
