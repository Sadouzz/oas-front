import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RendezVous, RendezVousStatus } from '../shared/models';

export type { RendezVous, RendezVousStatus };

@Injectable({ providedIn: 'root' })
export class RendezVousService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/admin/portal/rendezvous`;

  getAll(): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(this.api);
  }

  updateStatut(id: number, statut: RendezVousStatus, commentaire?: string): Observable<RendezVous> {
    let params = new HttpParams().set('statut', statut);
    if (commentaire) params = params.set('commentaire', commentaire);
    return this.http.put<RendezVous>(`${this.api}/${id}/statut`, null, { params });
  }

  valider(id: number, mecanicienIds: number[]): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${this.api}/${id}/valider`, mecanicienIds);
  }

  updateDate(id: number, nouvelleDate: string): Observable<RendezVous> {
    return this.http.put<RendezVous>(`${this.api}/${id}/date`, { nouvelleDate });
  }
}
