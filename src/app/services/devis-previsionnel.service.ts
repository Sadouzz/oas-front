import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DevisPrevisionnel {
  id: number;
  notesReparation: string;
  montantTotal: number;
  kilometrageVehicule: number;
  createdAt: string;
  vehicule: { id: number; immatriculation: string; marque: string; modele: string } | null;
  client: { id: number; firstName: string; lastName: string; phone: string } | null;
}

export interface DevisPrevisionnelRequest {
  notesReparation: string;
  montantTotal: number;
  kilometrageVehicule: number;
  vehiculeId: number;
  clientId: number;
}

@Injectable({ providedIn: 'root' })
export class DevisPrevisionnelService {
  private api = 'http://localhost:9090/api/devis-previsionnels';

  constructor(private http: HttpClient) {}

  getAll(params?: { clientId?: number; vehiculeId?: number }): Observable<DevisPrevisionnel[]> {
    const p: Record<string, string> = {};
    if (params?.clientId) p['clientId'] = String(params.clientId);
    if (params?.vehiculeId) p['vehiculeId'] = String(params.vehiculeId);
    return this.http.get<DevisPrevisionnel[]>(this.api, { params: p });
  }

  getById(id: number): Observable<DevisPrevisionnel> {
    return this.http.get<DevisPrevisionnel>(`${this.api}/${id}`);
  }

  create(data: DevisPrevisionnelRequest): Observable<DevisPrevisionnel> {
    return this.http.post<DevisPrevisionnel>(this.api, data);
  }

  update(id: number, data: DevisPrevisionnelRequest): Observable<DevisPrevisionnel> {
    return this.http.put<DevisPrevisionnel>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
