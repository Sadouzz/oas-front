import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BonDeLivraison {
  id: number; numero: string; dateCreation: string; ordreReparationId: number; ordreReparationNumero: string;
  clientId: number; clientNom: string; vehiculeId: number; immatriculation: string;
  tvaApplicable: boolean; montantHT: number; montantTVA: number; montantTTC: number; remarque?: string;
  bonsDeSortieIds: number[]; bonsDeSortieReferences: string[];
  factureId?: number; factureNumero?: string; noteDePrixId?: number; noteDePrixNumero?: string;
}
export interface BonDeSortieDisponible { id: number; reference: string; date: string; montant: number; }

@Injectable({ providedIn: 'root' })
export class BonDeLivraisonService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/bons-de-livraison`;
  list(params: { page: number; size: number; keyword?: string }): Observable<any> {
    const query: Record<string, string> = { page: String(params.page), size: String(params.size) };
    if (params.keyword) query['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: query });
  }
  create(data: { ordreReparationId: number; bonsDeSortieIds: number[]; appliquerTVA: boolean; remarque?: string }): Observable<BonDeLivraison> { return this.http.post<BonDeLivraison>(this.api, data); }
  getBonsDeSortie(ordreId: number): Observable<BonDeSortieDisponible[]> { return this.http.get<BonDeSortieDisponible[]>(`${this.api}/ordres-reparation/${ordreId}/bons-de-sortie`); }
  convertirFacture(id: number): Observable<any> { return this.http.post(`${this.api}/${id}/convertir-en-facture`, {}); }
  convertirNote(id: number): Observable<any> { return this.http.post(`${this.api}/${id}/convertir-en-note-de-prix`, {}); }
  pdf(id: number): Observable<Blob> { return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' }); }
}
