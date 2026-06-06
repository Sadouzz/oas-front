import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FicheAtelier, FicheAtelierRequest } from '../shared/models';

export type { FicheAtelier, FicheAtelierRequest };

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
}
