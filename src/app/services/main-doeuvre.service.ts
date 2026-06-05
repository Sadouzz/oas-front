import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type CategorieMainDoeuvre = 'MECANIQUE' | 'CARROSSERIE' | 'ELECTRIQUE' | 'PEINTURE';

export interface MainDoeuvreModel {
  id: number;
  prix: number;
  categorie: CategorieMainDoeuvre;
  nbreHeure: number;
  isArchived: boolean;
}

@Injectable({ providedIn: 'root' })
export class MainDoeuvreService {
  private http = inject(HttpClient);
  private base = 'http://localhost:9090/api/main-doeuvres';

  getAll(): Observable<MainDoeuvreModel[]> {
    return this.http.get<MainDoeuvreModel[]>(this.base);
  }

  create(data: any): Observable<MainDoeuvreModel> {
    return this.http.post<MainDoeuvreModel>(this.base, data);
  }

  update(id: number, data: any): Observable<MainDoeuvreModel> {
    return this.http.put<MainDoeuvreModel>(`${this.base}/${id}`, data);
  }

  setArchived(id: number, archived: boolean): Observable<MainDoeuvreModel> {
    return this.http.patch<MainDoeuvreModel>(`${this.base}/${id}/archive`, {}, { params: { archived: String(archived) } });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
