import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CategoriePiece {
  id?: number;
  nom: string;
  depot?: { id: number, nom?: string };
  isArchived?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriePieceService {
  private apiUrl = environment.apiUrl + '/api/categories';
  constructor(private http: HttpClient) { }
  getAll(): Observable<CategoriePiece[]> { return this.http.get<CategoriePiece[]>(this.apiUrl); }
  create(cat: CategoriePiece): Observable<CategoriePiece> { return this.http.post<CategoriePiece>(this.apiUrl, cat); }
  update(id: number, cat: CategoriePiece): Observable<CategoriePiece> { return this.http.put<CategoriePiece>(this.apiUrl + '/' + id, cat); }
  delete(id: number): Observable<any> { return this.http.delete(this.apiUrl + '/' + id); }
}
