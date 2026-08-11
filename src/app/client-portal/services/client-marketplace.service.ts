import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Produit, DemandeProduit, DemandeProduitRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientMarketplaceService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/marketplace`;

  getProduits(): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.api}/produits`);
  }

  search(keyword: string): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.api}/produits/search`, { params: { keyword } });
  }

  getProduit(id: number): Observable<Produit> {
    return this.http.get<Produit>(`${this.api}/produits/${id}`);
  }

  getPopulaires(): Observable<Produit[]> {
    return this.http.get<Produit[]>(`${this.api}/produits/populaires`);
  }

  creerDemande(request: DemandeProduitRequest): Observable<DemandeProduit> {
    return this.http.post<DemandeProduit>(`${this.api}/demandes`, request);
  }

  getMesDemandes(): Observable<DemandeProduit[]> {
    return this.http.get<DemandeProduit[]>(`${this.api}/demandes`);
  }

  getHistorique(): Observable<DemandeProduit[]> {
    return this.http.get<DemandeProduit[]>(`${this.api}/historique`);
  }

  annulerDemande(id: number): Observable<DemandeProduit> {
    return this.http.patch<DemandeProduit>(`${this.api}/demandes/${id}/annuler`, {});
  }
}
