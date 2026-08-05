import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RendezVous } from '../../shared/models';

export interface ClientRendezVousRequest {
  dateRendezVous: string;
  motif: string;
  vehiculeId: number | null;
}

@Injectable({ providedIn: 'root' })
export class ClientRendezVousService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/rendezvous`;

  getAll(): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(this.api);
  }

  create(payload: ClientRendezVousRequest): Observable<RendezVous> {
    return this.http.post<RendezVous>(this.api, payload);
  }

  annuler(id: number): Observable<void> {
    return this.http.put<void>(`${this.api}/${id}/annuler`, {});
  }
}
