import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrdreReparation, OrdreReparationRequest, StatutFiche } from '../shared/models';

export type { OrdreReparation, OrdreReparationRequest, StatutFiche };

@Injectable({ providedIn: 'root' })
export class OrdreReparationService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/ordres-reparation`;

  getAll(): Observable<OrdreReparation[]> {
    return this.http.get<OrdreReparation[]>(this.api);
  }

  getById(id: number): Observable<OrdreReparation> {
    return this.http.get<OrdreReparation>(`${this.api}/${id}`);
  }

  create(data: OrdreReparationRequest): Observable<OrdreReparation> {
    return this.http.post<OrdreReparation>(`${this.api}/create`, data);
  }

  update(id: number, data: OrdreReparationRequest): Observable<OrdreReparation> {
    return this.http.put<OrdreReparation>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }

  assignMecanicien(ficheId: number, mecId: number): Observable<any> {
    return this.http.post(`${this.api}/${ficheId}/mecaniciens/${mecId}`, {}, { responseType: 'text' as 'json' });
  }

  removeMecanicien(ficheId: number, mecId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ficheId}/mecaniciens/${mecId}`, { responseType: 'text' as 'json' });
  }

  assignMecanicienReparation(ficheId: number, mecId: number): Observable<any> {
    return this.http.post(`${this.api}/${ficheId}/mecaniciens-reparation/${mecId}`, {}, { responseType: 'text' as 'json' });
  }

  removeMecanicienReparation(ficheId: number, mecId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ficheId}/mecaniciens-reparation/${mecId}`, { responseType: 'text' as 'json' });
  }

  updateStatut(ficheId: number, statut: StatutFiche): Observable<OrdreReparation> {
    return this.http.patch<OrdreReparation>(`${this.api}/${ficheId}/statut`, null, { params: { statut } });
  }
}
