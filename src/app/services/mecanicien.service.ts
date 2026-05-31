import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Mecanicien {
  id: number;
  nom: string;
  createdAt: string;
  garage: { id: number; libelle: string; ville: string } | null;
}

export interface MecanicienRequest {
  nom: string;
  garageId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class MecanicienService {
  private api = 'http://localhost:9090/api/mecaniciens';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Mecanicien[]> {
    return this.http.get<Mecanicien[]>(this.api);
  }

  getById(id: number): Observable<Mecanicien> {
    return this.http.get<Mecanicien>(`${this.api}/${id}`);
  }

  create(data: MecanicienRequest): Observable<Mecanicien> {
    return this.http.post<Mecanicien>(`${this.api}/create`, data);
  }

  update(id: number, data: MecanicienRequest): Observable<Mecanicien> {
    return this.http.put<Mecanicien>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }
}
