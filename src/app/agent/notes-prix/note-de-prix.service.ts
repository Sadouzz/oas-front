import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NoteDePrixModel, NoteDePrixCreateRequest } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class NoteDePrixService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/notes-de-prix`;

  getAll(): Observable<NoteDePrixModel[]> {
    return this.http.get<NoteDePrixModel[]>(this.api);
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
}
