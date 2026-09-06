import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BonDeCommande, BonDeCommandeRequest, ReceptionBonDeCommandeRequest } from './models/bon-de-commande.model';

export * from './models/bon-de-commande.model';





@Injectable({ providedIn: 'root' })
export class BonDeCommandeService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/bons-de-commande`;

  getAll(params: import('../../shared/models').PageParams = {}): Observable<BonDeCommande[]> {
    const queryParams: Record<string, string> = {};
    if (params.page !== undefined) queryParams['page'] = params.page.toString();
    if (params.size !== undefined) queryParams['size'] = params.size.toString();
    if (params.keyword) queryParams['keyword'] = params.keyword;
    return this.http.get<BonDeCommande[]>(this.api, { params: queryParams });
  }

  getById(id: number): Observable<BonDeCommande> {
    return this.http.get<BonDeCommande>(`${this.api}/${id}`);
  }

  search(keyword: string): Observable<BonDeCommande[]> {
    return this.http.get<BonDeCommande[]>(`${this.api}/search`, { params: { keyword } });
  }

  recent(): Observable<BonDeCommande[]> {
    return this.http.get<BonDeCommande[]>(`${this.api}/recent`);
  }

  create(data: BonDeCommandeRequest): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(this.api, data);
  }

  update(id: number, data: BonDeCommandeRequest): Observable<BonDeCommande> {
    return this.http.put<BonDeCommande>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  envoyer(id: number): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/envoyer`, {});
  }

  receptionner(id: number): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/receptionner`, {});
  }

  annuler(id: number): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/annuler`, {});
  }

  assignerFournisseur(id: number, fournisseurId: number): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/assigner-fournisseur`, {}, { params: { fournisseurId } });
  }

  receptionnerAvecReception(id: number, data: ReceptionBonDeCommandeRequest): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/receptionner-reception`, data);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
