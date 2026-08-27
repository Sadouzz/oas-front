import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Depot {
  id?: number;
  nom: string;
  description?: string;
  isArchived?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DepotService {
  private apiUrl = environment.apiUrl + '/api/depots';
  constructor(private http: HttpClient) { }
  getAll(): Observable<Depot[]> { return this.http.get<Depot[]>(this.apiUrl); }
  create(depot: Depot): Observable<Depot> { return this.http.post<Depot>(this.apiUrl, depot); }
  update(id: number, depot: Depot): Observable<Depot> { return this.http.put<Depot>(this.apiUrl + '/' + id, depot); }
  delete(id: number): Observable<any> { return this.http.delete(this.apiUrl + '/' + id); }
}
