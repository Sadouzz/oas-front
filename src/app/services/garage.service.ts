import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Garage, GarageRequest } from '../shared/models';

export type { Garage, GarageRequest };

@Injectable({ providedIn: 'root' })
export class GarageService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/admin/garages`;

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
