import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Technicien, TechnicienRequest } from '../shared/models';

export type { Technicien, TechnicienRequest };

@Injectable({ providedIn: 'root' })
export class TechnicienService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/techniciens`;

  getAll(keyword?: string): Observable<Technicien[]> {
    return this.http.get<Technicien[]>(this.api, { params: keyword ? { keyword } : {} });
  }

  getById(id: number): Observable<Technicien> {
    return this.http.get<Technicien>(`${this.api}/${id}`);
  }

  create(data: TechnicienRequest): Observable<any> {
    return this.http.post(`${this.api}/create`, data);
  }

  update(id: number, data: TechnicienRequest): Observable<Technicien> {
    return this.http.put<Technicien>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }
}
