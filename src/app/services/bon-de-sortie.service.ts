import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LigneBonDeSortie {
  id: number;
  piece: { id: number; reference: string; numeroDeSerie: string; prix?: number } | null;
  quantite: number;
}

export interface BonDeSortie {
  id: number;
  reference: string;
  date: string;
  statut: 'EN_ATTENTE' | 'VALIDE';
  remarque: string;
  dateValidation: string | null;
  client: { id: number; firstName: string; lastName: string; phone: string } | null;
  vehicule: { id: number; immatriculation: string; marque: string; modele: string } | null;
  agentEmetteur: { id: number; username: string; firstName: string; lastName: string } | null;
  agentValidateur?: { id: number; username: string; firstName: string; lastName: string };
  lignesBonDeSortiePieces: LigneBonDeSortie[];
  lignesBonDeSortieMainDoeuvres: any[];
}

export interface BonDeSortieRequest {
  clientId: number;
  vehiculeId: number;
  lignesPieces: { pieceId: number; quantite: number }[];
  lignesMainDoeuvres?: { mainDoeuvreId: number; quantite: number }[];
  remarque?: string;
}

@Injectable({ providedIn: 'root' })
export class BonDeSortieService {
  private api = 'http://localhost:9090/api/bons-de-sortie';

  constructor(private http: HttpClient) {}

  getAll(params?: { statut?: string; clientId?: number; vehiculeId?: number }): Observable<BonDeSortie[]> {
    const p: Record<string, string> = {};
    if (params?.statut) p['statut'] = params.statut;
    if (params?.clientId) p['clientId'] = String(params.clientId);
    if (params?.vehiculeId) p['vehiculeId'] = String(params.vehiculeId);
    return this.http.get<BonDeSortie[]>(this.api, { params: p });
  }

  getById(id: number): Observable<BonDeSortie> {
    return this.http.get<BonDeSortie>(`${this.api}/${id}`);
  }

  creer(data: BonDeSortieRequest): Observable<BonDeSortie> {
    return this.http.post<BonDeSortie>(`${this.api}/creer`, data);
  }

  valider(id: number): Observable<BonDeSortie> {
    return this.http.put<BonDeSortie>(`${this.api}/${id}/valider`, {});
  }
}
