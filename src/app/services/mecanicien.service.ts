import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Mecanicien, MecanicienRequest } from '../shared/models';

export type { Mecanicien, MecanicienRequest };

@Injectable({ providedIn: 'root' })
export class MecanicienService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/mecaniciens`;

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
