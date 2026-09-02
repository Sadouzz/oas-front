import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VehiculeModel } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ClientVehiculeService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/client/vehicules`;

  getAll(): Observable<VehiculeModel[]> {
    return this.http.get<VehiculeModel[]>(this.api);
  }

  getById(id: number): Observable<VehiculeModel> {
    return this.http.get<VehiculeModel>(`${this.api}/${id}`);
  }

  create(data: any): Observable<VehiculeModel> {
    return this.http.post<VehiculeModel>(this.api, data);
  }

  update(id: number, data: any): Observable<VehiculeModel> {
    return this.http.put<VehiculeModel>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
