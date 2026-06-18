import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CategorieMainDoeuvreModel {
  id: number;
  nom: string;
}

export interface CategorieMainDoeuvreRequest {
  nom: string;
}

@Injectable({ providedIn: 'root' })
export class CategorieMainDoeuvreService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/categorie-main-doeuvres`;

  getAll(): Observable<CategorieMainDoeuvreModel[]> {
    return this.http.get<CategorieMainDoeuvreModel[]>(this.base);
  }

  create(data: CategorieMainDoeuvreRequest): Observable<CategorieMainDoeuvreModel> {
    return this.http.post<CategorieMainDoeuvreModel>(this.base, data);
  }

  update(id: number, data: CategorieMainDoeuvreRequest): Observable<CategorieMainDoeuvreModel> {
    return this.http.put<CategorieMainDoeuvreModel>(`${this.base}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
