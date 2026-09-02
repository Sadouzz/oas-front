import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategorieMainDoeuvre, MainDoeuvreModel, MainDoeuvreRequest } from '../../shared/models';

export type { CategorieMainDoeuvre, MainDoeuvreModel, MainDoeuvreRequest };

@Injectable({ providedIn: 'root' })
export class MainDoeuvreService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/main-doeuvres`;

  getAll(): Observable<MainDoeuvreModel[]> {
    return this.http.get<MainDoeuvreModel[]>(this.base);
  }

  create(data: MainDoeuvreRequest): Observable<MainDoeuvreModel> {
    return this.http.post<MainDoeuvreModel>(this.base, data);
  }

  update(id: number, data: MainDoeuvreRequest): Observable<MainDoeuvreModel> {
    return this.http.put<MainDoeuvreModel>(`${this.base}/${id}`, data);
  }

  setArchived(id: number, archived: boolean): Observable<MainDoeuvreModel> {
    return this.http.patch<MainDoeuvreModel>(`${this.base}/${id}/archive`, {}, { params: { archived: String(archived) } });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
