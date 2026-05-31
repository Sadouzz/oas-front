import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Garage {
  id: number;
  libelle: string;
  ville: string;
  adresse: string;
  contact: string;
  createdAt: string;
}

export interface GarageRequest {
  libelle: string;
  ville: string;
  adresse: string;
  contact: string;
}

@Injectable({ providedIn: 'root' })
export class GarageService {
  private api = 'http://localhost:9090/api/admin/garages';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Garage[]> {
    return this.http.get<Garage[]>(this.api);
  }

  getById(id: number): Observable<Garage> {
    return this.http.get<Garage>(`${this.api}/${id}`);
  }

  create(data: GarageRequest): Observable<Garage> {
    return this.http.post<Garage>(`${this.api}/create`, data);
  }

  update(id: number, data: GarageRequest): Observable<Garage> {
    return this.http.put<Garage>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }
}
