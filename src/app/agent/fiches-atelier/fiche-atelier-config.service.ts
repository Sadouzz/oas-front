import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BriqueConfig {
  id?: number;
  label: string;
  type: string;
  options?: string;
  ordre?: number;
  obligatoire?: boolean;
}

export interface FicheAtelierConfigBackend {
  id?: number;
  configJson: string;
}

@Injectable({
  providedIn: 'root'
})
export class FicheAtelierConfigService {
  private apiUrl = environment.apiUrl + '/api/fiche-atelier-configs';
  constructor(private http: HttpClient) { }
  getAll(): Observable<FicheAtelierConfigBackend[]> { return this.http.get<FicheAtelierConfigBackend[]>(this.apiUrl); }
  create(config: FicheAtelierConfigBackend): Observable<FicheAtelierConfigBackend> { return this.http.post<FicheAtelierConfigBackend>(this.apiUrl, config); }
  update(id: number, config: FicheAtelierConfigBackend): Observable<FicheAtelierConfigBackend> { return this.http.put<FicheAtelierConfigBackend>(this.apiUrl + '/' + id, config); }
}
