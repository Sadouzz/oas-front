import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PartenaireModel } from '../shared/models';

export type { PartenaireModel };

@Injectable({ providedIn: 'root' })
export class PartenaireService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/partenaires`;

  getAll(): Observable<PartenaireModel[]> {
    return this.http.get<PartenaireModel[]>(this.base);
  }

  getById(id: number): Observable<PartenaireModel> {
    return this.http.get<PartenaireModel>(`${this.base}/${id}`);
  }

  create(data: Partial<PartenaireModel>): Observable<PartenaireModel> {
    return this.http.post<PartenaireModel>(`${this.base}/create`, data);
  }

  update(id: number, data: Partial<PartenaireModel>): Observable<PartenaireModel> {
    return this.http.put<PartenaireModel>(`${this.base}/${id}`, data);
  }

  archive(id: number): Observable<any> {
    return this.http.patch(`${this.base}/${id}/archive`, {});
  }

  unarchive(id: number): Observable<any> {
    return this.http.patch(`${this.base}/${id}/unarchive`, {});
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
