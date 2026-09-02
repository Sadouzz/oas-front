import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FournisseurModel } from '../../shared/models';

export type { FournisseurModel };

@Injectable({ providedIn: 'root' })
export class FournisseurService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/fournisseurs`;

  getAll(keyword?: string): Observable<FournisseurModel[]> {
    const params: any = {};
    if (keyword) params['keyword'] = keyword;
    return this.http.get<FournisseurModel[]>(this.base, { params });
  }

  create(data: Partial<FournisseurModel>): Observable<FournisseurModel> {
    return this.http.post<FournisseurModel>(`${this.base}/create`, data);
  }

  update(id: number, data: Partial<FournisseurModel>): Observable<FournisseurModel> {
    return this.http.put<FournisseurModel>(`${this.base}/${id}`, data);
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
