import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface VehicleTransferRequest {
  id: number;
  vehicleId: number;
  immatriculation: string;
  marque: string;
  modele: string;
  chassis?: string;
  requesterName: string;
  currentOwnerName: string;
  requestNote?: string;
  requestedAt: string;
}

@Injectable({ providedIn: 'root' })
export class VehicleTransferService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/vehicle-transfers`;
  pending() { return this.http.get<VehicleTransferRequest[]>(`${this.api}/pending`); }
  decide(id: number, approved: boolean, decisionNote: string) {
    return this.http.post<VehicleTransferRequest>(`${this.api}/${id}/decision`, { approved, decisionNote });
  }
}
