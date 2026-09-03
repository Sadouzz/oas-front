import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DashboardSuperAgentResponseDTO,
  DashboardAgentResponse,
  DashboardChefAtelierResponse,
  DashboardAgentMagasinResponse
} from './models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/dashboard`;

  getSuperAgentDashboard(): Observable<DashboardSuperAgentResponseDTO> {
    return this.http.get<DashboardSuperAgentResponseDTO>(`${this.api}/super-agent`);
  }

  getAgentDashboard(): Observable<DashboardAgentResponse> {
    return this.http.get<DashboardAgentResponse>(`${this.api}/agent`);
  }

  getChefAtelierDashboard(): Observable<DashboardChefAtelierResponse> {
    return this.http.get<DashboardChefAtelierResponse>(`${this.api}/chef-atelier`);
  }

  getAgentMagasinDashboard(): Observable<DashboardAgentMagasinResponse> {
    return this.http.get<DashboardAgentMagasinResponse>(`${this.api}/agent-magasin`);
  }
}
