import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Depot } from './models/piece-detachee.model';
import { PageParams } from '../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class DepotService {
  private apiUrl = environment.apiUrl + '/api/depots';
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

  create(depot: Depot): Observable<Depot> { return this.http.post<Depot>(this.apiUrl, depot); }
  update(id: number, depot: Depot): Observable<Depot> { return this.http.put<Depot>(this.apiUrl + '/' + id, depot); }
  delete(id: number): Observable<any> { return this.http.delete(this.apiUrl + '/' + id); }
}
