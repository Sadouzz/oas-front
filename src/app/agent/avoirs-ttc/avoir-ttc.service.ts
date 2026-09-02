import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AvoirTTC {
  id: number;
  numero: string;
  dateCreation: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantTimbre: number;
  montantTotal: number;
  agentNom: string;
  remarque: string | null;
  kilometrage: number;
  clientId: number;
  clientNom: string;
  vehiculeId: number | null;
  immatriculation: string | null;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  numeroBonDeCommande: string | null;
  lignesPieces: { id: number; designationPiece: string; quantite: number; prix: number; montantTotal: number }[];
  lignesMainDoeuvres: { id: number; descriptionMainDoeuvre: string; nbreHeure: number; tarifHoraire: number; montantTotal: number }[];
}

export interface AvoirTTCCreateRequest {
  clientId: number;
  vehiculeId?: number | null;
  kilometrage?: number;
  remarque?: string;
  appliquerTVA?: boolean;
  montantTimbre?: number;
  lignesPieces: {
    pieceId?: number | null;
    designationPds?: string;
    isCustom?: boolean;
    quantite: number;
    prix: number;
  }[];
  lignesMainDoeuvres?: {
    mainDoeuvreId?: number | null;
    nbreHeure: number;
    tarifHoraire: number;
  }[];
}

@Injectable({ providedIn: 'root' })
export class AvoirTTCService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/avoirs-ttc`;

  getAll(params: import('../../shared/models').PageParams = {}): Observable<AvoirTTC[]> {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams['page'] = params.page.toString();
    if (params.size !== undefined) queryParams['size'] = params.size.toString();
    if (params.keyword) queryParams['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: queryParams });
  }

  getById(id: number): Observable<AvoirTTC> {
    return this.http.get<AvoirTTC>(`${this.api}/${id}`);
  }

  create(data: AvoirTTCCreateRequest): Observable<AvoirTTC> {
    return this.http.post<AvoirTTC>(this.api, data);
  }

  search(keyword: string): Observable<AvoirTTC[]> {
    return this.http.get<AvoirTTC[]>(`${this.api}/search`, { params: { keyword } });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
