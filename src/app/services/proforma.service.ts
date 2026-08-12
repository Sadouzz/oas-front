import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LignePiece {
  id: number;
  pieceId: number;
  designationPiece: string;
  quantite: number;
  prix: number;
  montantTotal: number;
}

export interface LigneMD {
  id: number;
  mainDoeuvreId: number;
  descriptionMainDoeuvre: string;
  nbreHeure: number;
  tarifHoraire: number;
  montantTotal: number;
}

export interface Proforma {
  id: number;
  numero: string;
  dateCreation: string;
  dateModification: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantTimbre: number;
  montantAutre: number;
  montantTotal: number;
  agentNom: string;
  remarque: string | null;
  kilometrage: number;
  clientId: number;
  clientNom: string;
  vehiculeId: number | null;
  immatriculation: string | null;
  numeroChassis: string | null;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  numeroBonDeCommande: string | null;
  statut?: string;
  lignesPieces: LignePiece[];
  lignesMainDoeuvres: LigneMD[];
}

export interface ProformaRequest {
  clientId: number;
  ordreReparationId?: number | null;
  vehiculeId?: number | null;
  kilometrage: number;
  immatriculation?: string;
  numeroChassis?: string;
  marque?: string;
  modele?: string;
  annee?: number | null;
  numeroBonDeCommande?: string;
  remarque?: string;
  tvaRate?: number | null;
  montantTimbre?: number;
  montantAutre?: number;
  lignesPieces: { pieceId: number; quantite: number; prix: number }[];
  lignesMainDoeuvres: { mainDoeuvreId: number; nbreHeure: number; tarifHoraire: number }[];
}

@Injectable({ providedIn: 'root' })
export class ProformaService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/proformas`;

  getAll(): Observable<Proforma[]> {
    return this.http.get<Proforma[]>(this.api);
  }

  getById(id: number): Observable<Proforma> {
    return this.http.get<Proforma>(`${this.api}/${id}`);
  }

  getByOrdreReparationId(ordreReparationId: number): Observable<Proforma> {
    return this.http.get<Proforma>(`${this.api}/ordre-reparation/${ordreReparationId}`);
  }

  search(keyword: string): Observable<Proforma[]> {
    return this.http.get<Proforma[]>(`${this.api}/search`, { params: { keyword } });
  }

  recent(): Observable<Proforma[]> {
    return this.http.get<Proforma[]>(`${this.api}/recent`);
  }

  create(data: ProformaRequest): Observable<Proforma> {
    return this.http.post<Proforma>(this.api, data);
  }

  update(id: number, data: ProformaRequest): Observable<Proforma> {
    return this.http.put<Proforma>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  valider(id: number): Observable<Proforma> {
    return this.http.put<Proforma>(`${this.api}/${id}/valider`, {});
  }

  convertToFacture(id: number): Observable<any> {
    return this.http.post<any>(`${this.api}/${id}/convert`, {});
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
