import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RecuDetail, RecuListItem, RecuPage, RecuSearchParams, VersementClientRequest } from './models/recu.model';
import type { PdfLayoutKey } from '../../shared/components/pdf-layout-dialog/pdf-layout-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class RecuService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/recus`;

  getEnCours(params: RecuSearchParams = {}): Observable<RecuPage<RecuListItem>> {
    return this.http.get<RecuPage<RecuListItem>>(`${this.apiUrl}/en-cours`, { params: this.toParams(params) });
  }

  getPayes(params: RecuSearchParams = {}): Observable<RecuPage<RecuListItem>> {
    return this.http.get<RecuPage<RecuListItem>>(`${this.apiUrl}/payes`, { params: this.toParams(params) });
  }

  /** Crée ou met à jour le reçu en cours du client. */
  ouvrirPourClient(clientId: number): Observable<RecuDetail> {
    return this.http.post<RecuDetail>(`${this.apiUrl}/client/${clientId}`, null);
  }

  getById(id: number): Observable<RecuDetail> {
    return this.http.get<RecuDetail>(`${this.apiUrl}/${id}`);
  }

  verser(id: number, request: VersementClientRequest): Observable<RecuDetail> {
    return this.http.post<RecuDetail>(`${this.apiUrl}/${id}/versements`, request);
  }

  /** Annule un versement : les documents, le solde prépayé et le reçu sont remis à jour. */
  annulerVersement(id: number, versementId: number): Observable<RecuDetail> {
    return this.http.delete<RecuDetail>(`${this.apiUrl}/${id}/versements/${versementId}`);
  }

  valider(id: number): Observable<RecuDetail> {
    return this.http.post<RecuDetail>(`${this.apiUrl}/${id}/valider`, null);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** PDF du reçu (« Voir/Imprimer reçu »), avec ou sans en-tête. */
  downloadPdf(id: number, layoutKey: PdfLayoutKey = 'AVEC_ENTETE'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { params: { layoutKey }, responseType: 'blob' });
  }

  /**
   * Encaissement depuis une facture / un OR : ouvre le reçu en cours du client
   * puis y enregistre un versement. Le montant est réparti par le serveur sur
   * les documents impayés du client, du plus ancien au plus récent.
   */
  verserPourClient(clientId: number, request: VersementClientRequest): Observable<RecuDetail> {
    return this.ouvrirPourClient(clientId).pipe(
      switchMap(recu => this.verser(recu.id, request))
    );
  }

  private toParams(params: RecuSearchParams): Record<string, string> {
    const p: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') p[key] = String(value);
    }
    return p;
  }
}
