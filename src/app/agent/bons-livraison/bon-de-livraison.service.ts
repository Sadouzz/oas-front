import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BonDeLivraison {
  id: number; numero: string; dateCreation: string; ordreReparationId: number; ordreReparationNumero: string;
  clientId: number; clientNom: string; vehiculeId: number; immatriculation: string;
  tvaApplicable: boolean; montantHT: number; montantTVA: number; montantTTC: number; remarque?: string;
  bonsDeSortieIds: number[]; bonsDeSortieReferences: string[];
  lignesPieces?: Array<{
    id: number; pieceId: number | null; type: 'PDP' | 'PDG' | 'PDS' | string;
    designation: string; reference?: string | null; quantite: number; prix: number;
    tauxRemise: number; datesHeuresSaisieSource: string[];
  }>;
  lignesMainDoeuvres?: Array<{
    id: number; mainDoeuvreId: number | null; designation: string;
    nbreHeure: number; tarifHoraire: number; tauxRemise: number;
  }>;
  factureId?: number; factureNumero?: string; noteDePrixId?: number; noteDePrixNumero?: string;
}
export interface BonDeSortieDisponible {
  id: number;
  reference: string;
  date: string;
  montant: number;
  clientId: number | null;
  vehiculeId: number | null;
  ordreReparationId: number;
}

export interface BonDeLivraisonOrdreContext {
  ordreReparationId: number;
  ordreReparationNumero: string;
  tvaApplicable: boolean;
  bonsDeSortieValides: BonDeSortieDisponible[];
  bonDeLivraison: {
    id: number;
    numero: string;
    montantTTC: number;
    factureId?: number | null;
    factureNumero?: string | null;
    noteDePrixId?: number | null;
    noteDePrixNumero?: string | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class BonDeLivraisonService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/bons-de-livraison`;
  list(params: { page: number; size: number; keyword?: string }): Observable<any> {
    const query: Record<string, string> = { page: String(params.page), size: String(params.size) };
    if (params.keyword) query['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: query });
  }
  create(data: { ordreReparationId: number; appliquerTVA?: boolean; remarque?: string }): Observable<BonDeLivraison> {
    return this.http.post<BonDeLivraison>(this.api, data);
  }
  getById(id: number): Observable<BonDeLivraison> { return this.http.get<BonDeLivraison>(`${this.api}/${id}`); }
  getBonsDeSortie(ordreId: number): Observable<BonDeSortieDisponible[]> {
    return this.http.get<BonDeSortieDisponible[]>(`${this.api}/ordres-reparation/${ordreId}/bons-de-sortie`);
  }
  getContexteOrdre(ordreId: number): Observable<BonDeLivraisonOrdreContext> {
    return this.http.get<BonDeLivraisonOrdreContext>(`${this.api}/ordres-reparation/${ordreId}/contexte`);
  }
  creerFactureDepuisOrdre(ordreId: number, data: { appliquerTVA?: boolean; remarque?: string }): Observable<{ id: number; numero: string }> {
    return this.http.post<{ id: number; numero: string }>(`${this.api}/ordres-reparation/${ordreId}/facture`, data);
  }
  convertirFacture(id: number): Observable<any> {
    return this.http.post(`${this.api}/${id}/convertir-en-facture`, {});
  }
  convertirNote(id: number): Observable<any> {
    return this.http.post(`${this.api}/${id}/convertir-en-note-de-prix`, {});
  }
  pdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
