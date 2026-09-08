import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategoriePiece } from './models/piece-detachee.model';
import { PageParams } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class CategoriePieceService {
  private apiUrl = environment.apiUrl + '/api/categories';
  private http = inject(HttpClient);

  getAll(params: PageParams = {}): Observable<any> {
    const queryParams: Record<string, string> = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams[key] = params[key].toString();
      }
    });
    return this.http.get<any>(this.apiUrl, { params: queryParams });
  }

  create(cat: CategoriePiece): Observable<CategoriePiece> { return this.http.post<CategoriePiece>(this.apiUrl, cat); }
  update(id: number, cat: CategoriePiece): Observable<CategoriePiece> { return this.http.put<CategoriePiece>(this.apiUrl + '/' + id, cat); }
  delete(id: number): Observable<any> { return this.http.delete(this.apiUrl + '/' + id); }
}
