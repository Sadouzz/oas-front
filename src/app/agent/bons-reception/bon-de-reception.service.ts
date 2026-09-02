import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LigneFacturationPiece {
  id: number;
  pieceId: number;
  designationPiece: string;
  quantite: number;
  prix: number;
  montantTotal: number;
}

export interface LigneFacturationMainDoeuvre {
  id: number;
  mainDoeuvreId: number;
  descriptionMainDoeuvre: string;
  nbreHeure: number;
  tarifHoraire: number;
  montantTotal: number;
}

export interface BonDeReception {
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
  bonDeCommandeId: number | null;
  bonDeCommandeNumero: string | null;
  lignesPieces: LigneFacturationPiece[];
  lignesMainDoeuvres: LigneFacturationMainDoeuvre[];
}

export interface BonDeReceptionRequest {
  bonDeCommandeId?: number | null;
  kilometrage: number;
  remarque?: string;
  lignesPieces: { pieceId: number; quantite: number; prix: number }[];
  lignesMainDoeuvres: { mainDoeuvreId: number; nbreHeure: number; tarifHoraire: number }[];
}

@Injectable({ providedIn: 'root' })
export class BonDeReceptionService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/bons-de-reception`;

  getAll(): Observable<BonDeReception[]> {
    return this.http.get<BonDeReception[]>(this.api);
  }

  getById(id: number): Observable<BonDeReception> {
    return this.http.get<BonDeReception>(`${this.api}/${id}`);
  }

  recent(): Observable<BonDeReception[]> {
    return this.http.get<BonDeReception[]>(`${this.api}/recent`);
  }

  create(data: BonDeReceptionRequest): Observable<BonDeReception> {
    return this.http.post<BonDeReception>(this.api, data);
  }

  update(id: number, data: BonDeReceptionRequest): Observable<BonDeReception> {
    return this.http.put<BonDeReception>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
