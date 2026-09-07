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

  getAll(params: import('../../shared/models').PageParams | string = {}): Observable<any> {
    const queryParams: Record<string, string> = {};
    if (typeof params === 'string') {
      if (params) queryParams['keyword'] = params;
    } else {
      if (params.page !== undefined) queryParams['page'] = params.page.toString();
      if (params.size !== undefined) queryParams['size'] = params.size.toString();
      if (params.keyword) queryParams['keyword'] = params.keyword;
    }
    return this.http.get<any>(this.base, { params: queryParams });
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
