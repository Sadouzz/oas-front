import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Technicien, TechnicienRequest, PageResponse, PageParams } from '../../shared/models';

export type { Technicien, TechnicienRequest };

@Injectable({ providedIn: 'root' })
export class TechnicienService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/techniciens`;

  getAll(params: PageParams & { keyword?: string } = {}): Observable<PageResponse<Technicien> | Technicien[]> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());
    if (params.keyword) httpParams = httpParams.set('keyword', params.keyword);
    return this.http.get<PageResponse<Technicien> | Technicien[]>(this.api, { params: httpParams });
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
