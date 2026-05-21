import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserModel } from './client.service';

export interface VehiculeModel {
  id: number;
  immatriculation: string;
  annee: number;
  modele: string;
  marque: string;
  kilometrage: number;
  numeroChassis: string;
  client: UserModel;
  createdAt: string;
}

export interface VehiculeRequest {
  immatriculation: string;
  annee: number | null;
  modele: string;
  marque: string;
  kilometrage: number | null;
  numeroChassis: string;
  clientId: number | null;
}

@Injectable({ providedIn: 'root' })
export class VehiculeService {
  private api = 'http://localhost:9090/api/vehicules';

  constructor(private http: HttpClient) {}

  getAll(keyword?: string): Observable<VehiculeModel[]> {
    const params: Record<string, string> = keyword ? { keyword } : {};
    return this.http.get<VehiculeModel[]>(this.api, { params });
  }

  getRecent(): Observable<VehiculeModel[]> {
    return this.http.get<VehiculeModel[]>(`${this.api}/recent`);
  }

  getById(id: number): Observable<VehiculeModel> {
    return this.http.get<VehiculeModel>(`${this.api}/${id}`);
  }

  getByClient(clientId: number): Observable<VehiculeModel[]> {
    return this.http.get<VehiculeModel[]>(`${this.api}/client/${clientId}`);
  }

  create(data: VehiculeRequest): Observable<VehiculeModel> {
    return this.http.post<VehiculeModel>(`${this.api}/create`, data);
  }

  update(id: number, data: VehiculeRequest): Observable<VehiculeModel> {
    return this.http.put<VehiculeModel>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }
}
