import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FicheAtelier, FicheAtelierRequest, StatutReparation } from '../shared/models';

export type { FicheAtelier, FicheAtelierRequest, StatutReparation };

@Injectable({ providedIn: 'root' })
export class FicheAtelierService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/fiches-atelier`;

  getAll(): Observable<FicheAtelier[]> {
    return this.http.get<FicheAtelier[]>(this.api);
  }

  getById(id: number): Observable<FicheAtelier> {
    return this.http.get<FicheAtelier>(`${this.api}/${id}`);
  }

  create(data: FicheAtelierRequest): Observable<FicheAtelier> {
    return this.http.post<FicheAtelier>(`${this.api}/create`, data);
  }

  update(id: number, data: FicheAtelierRequest): Observable<FicheAtelier> {
    return this.http.put<FicheAtelier>(`${this.api}/${id}`, data);
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

  updateStatut(ficheId: number, statut: StatutReparation): Observable<FicheAtelier> {
    return this.http.patch<FicheAtelier>(`${this.api}/${ficheId}/statut`, null, { params: { statut } });
  }
}
