import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserModel } from '../../shared/models';
import {
  ClientDashboard,
  ClientVehiculeCard,
  ClientInterventionSummary,
  ClientInterventionItem,
  ClientBookingContext
} from '../models';

@Injectable({ providedIn: 'root' })
export class ClientPortalService {
  private http = inject(HttpClient);
  private clientApi = `${environment.apiUrl}/api/clients`;
  private portalApi = `${environment.apiUrl}/api/client-portal`;

  private me$?: Observable<UserModel>;

  getMe(): Observable<UserModel> {
    if (!this.me$) {
      this.me$ = this.http.get<UserModel>(`${this.clientApi}/me`).pipe(
        shareReplay(1)
      );
    }
    return this.me$;
  }

  clearMeCache(): void {
    this.me$ = undefined;
  }

  getDashboard(): Observable<ClientDashboard> {
    return this.http.get<ClientDashboard>(`${this.portalApi}/dashboard`);
  }

  getVehicules(): Observable<ClientVehiculeCard[]> {
    return this.http.get<ClientVehiculeCard[]>(`${this.portalApi}/vehicules`);
  }

  getVehiculeHistorique(vehiculeId: number): Observable<ClientInterventionSummary[]> {
    return this.http.get<ClientInterventionSummary[]>(`${this.portalApi}/vehicules/${vehiculeId}/historique`);
  }

  getInterventions(): Observable<ClientInterventionItem[]> {
    return this.http.get<ClientInterventionItem[]>(`${this.portalApi}/interventions`);
  }

  getBookingContext(): Observable<ClientBookingContext> {
    return this.http.get<ClientBookingContext>(`${this.portalApi}/rendez-vous/booking-context`);
  }
}
