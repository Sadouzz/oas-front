import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AvoirHT {
  id: number;
  numero: string;
  dateCreation: string;
  montantHT: number;
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

export interface AvoirHTCreateRequest {
  clientId: number;
  vehiculeId?: number | null;
  kilometrage?: number;
  remarque?: string;
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
export class AvoirHTService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/avoirs-ht`;

  getAll(): Observable<AvoirHT[]> {
    return this.http.get<AvoirHT[]>(this.api);
  }

  getById(id: number): Observable<AvoirHT> {
    return this.http.get<AvoirHT>(`${this.api}/${id}`);
  }

  create(data: AvoirHTCreateRequest): Observable<AvoirHT> {
    return this.http.post<AvoirHT>(this.api, data);
  }

  search(keyword: string): Observable<AvoirHT[]> {
    return this.http.get<AvoirHT[]>(`${this.api}/search`, { params: { keyword } });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
