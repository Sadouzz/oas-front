import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VehiculeModel } from '../../shared/models';

export interface ClientVehiculeRequest {
  immatriculation: string;
  marque: string;
  modele: string;
  annee: number | null;
  kilometrage: number | null;
  numeroChassis: string;
}

@Injectable({ providedIn: 'root' })
export class ClientVehiculeService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/vehicules`;

  getAll(): Observable<VehiculeModel[]> {
    return this.http.get<VehiculeModel[]>(this.api);
  }

  create(payload: ClientVehiculeRequest): Observable<VehiculeModel> {
    return this.http.post<VehiculeModel>(this.api, payload);
  }
}
