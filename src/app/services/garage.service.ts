import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Garage } from '../shared/models/garage.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GarageService {
  private apiUrl = `${environment.apiUrl}/api/admin/garages`; // À adapter selon l'URL de votre API

  constructor(private http: HttpClient) { }

  getAll(): Observable<Garage[]> {
    return this.http.get<Garage[]>(this.apiUrl);
  }

  getById(id: number): Observable<Garage> {
    return this.http.get<Garage>(`${this.apiUrl}/${id}`);
  }

  create(data: Partial<Garage>): Observable<Garage> {
    return this.http.post<Garage>(this.apiUrl, data);
  }

  update(id: number, data: Partial<Garage>): Observable<Garage> {
    return this.http.put<Garage>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
