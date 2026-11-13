import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NoteDePrixModel, NoteDePrixCreateRequest, PageParams } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class NoteDePrixService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/notes-de-prix`;

  getAll(params?: PageParams): Observable<NoteDePrixModel[]> {
    const p: Record<string, string> = {};
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null && value !== '') p[key] = String(value);
    }
    return this.http.get<any>(this.api, { params: p });
  }

  getById(id: number): Observable<NoteDePrixModel> {
    return this.http.get<NoteDePrixModel>(`${this.api}/${id}`);
  }

  create(data: NoteDePrixCreateRequest): Observable<NoteDePrixModel> {
    return this.http.post<NoteDePrixModel>(this.api, data);
  }

  update(id: number, data: NoteDePrixCreateRequest): Observable<NoteDePrixModel> {
    return this.http.put<NoteDePrixModel>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  downloadPdf(id: number, layoutKey: 'AVEC_ENTETE' | 'SANS_ENTETE' = 'AVEC_ENTETE'): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { params: { layoutKey }, responseType: 'blob' });
  }
}
