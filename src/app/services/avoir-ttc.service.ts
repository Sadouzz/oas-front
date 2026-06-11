import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class AvoirTTCService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/avoirs-ttc`;

  getAll(): Observable<AvoirTTC[]> {
    return this.http.get<AvoirTTC[]>(this.api);
  }

  getById(id: number): Observable<AvoirTTC> {
    return this.http.get<AvoirTTC>(`${this.api}/${id}`);
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
