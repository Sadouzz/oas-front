import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  OrdreTravail,
  OrdreTravailSummaryDto,
  OrdreTravailRequest,
  StatutOrdreTravail,
  StepRecapitulatifResponseDto,
  StepApprovisionnementResponseDto,
  StepBonSortieResponseDto,
  StepAssignationResponseDto,
  StepAssignationDto,
  StepReparationResponseDto,
  StepReparationDto,
  StepPaiementResponseDto,
  StepPretALivrerResponseDto,
  StepPretALivrerDto,
  StepLivraisonResponseDto,
  StepLivraisonDto
} from './models/ordre-travail.model';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrdreTravailService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/ordres-travail`;

  // ─── Consultation & CRUD de base ─────────────────────────────────

  getAll(params?: {
    search?: string;
    page?: number;
    size?: number;
    sort?: string;
    statut?: string;
    dateDebut?: string;
    dateFin?: string;
  }): Observable<PageResponse<OrdreTravail>> {
    let httpParams = new HttpParams();
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.size !== undefined) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    if (params?.sort) {
      httpParams = httpParams.set('sort', params.sort);
    }
    if (params?.statut) {
      httpParams = httpParams.set('statut', params.statut);
    }
    if (params?.dateDebut) {
      httpParams = httpParams.set('dateDebut', params.dateDebut);
    }
    if (params?.dateFin) {
      httpParams = httpParams.set('dateFin', params.dateFin);
    }

    return this.http.get<any>(this.api, { params: httpParams }).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  getById(id: number): Observable<OrdreTravail> {
    return this.http.get<any>(`${this.api}/${id}`).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  getSummary(id: number): Observable<OrdreTravailSummaryDto> {
    return this.http.get<any>(`${this.api}/${id}/summary`).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res)),
      catchError(() => this.getById(id))
    );
  }

  getSummaryByOrdreReparationId(ordreReparationId: number): Observable<OrdreTravailSummaryDto> {
    return this.http.get<any>(`${this.api}/ordre-reparation/${ordreReparationId}/summary`).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res)),
      catchError(() => this.http.get<any>(`${this.api}/ordre-reparation/${ordreReparationId}`).pipe(
        map((res: any) => (res && res.data !== undefined ? res.data : res))
      ))
    );
  }

  getByOrdreReparationId(ordreReparationId: number): Observable<OrdreTravailSummaryDto> {
    return this.getSummaryByOrdreReparationId(ordreReparationId);
  }

  create(data: OrdreTravailRequest): Observable<OrdreTravail> {
    return this.http.post<any>(this.api, data).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  createFromOrdreReparation(ordreReparationId: number): Observable<OrdreTravail> {
    return this.http.post<any>(
      `${this.api}/depuis-ordre-reparation/${ordreReparationId}`,
      {}
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  createFromProforma(proformaId: number): Observable<OrdreTravail> {
    return this.http.post<any>(
      `${this.api}/depuis-proforma/${proformaId}`,
      {}
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  update(id: number, data: Partial<OrdreTravail>): Observable<OrdreTravail> {
    return this.http.put<any>(`${this.api}/${id}`, data).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  updateStatut(id: number, statut: StatutOrdreTravail | string): Observable<void> {
    const params = new HttpParams().set('statut', statut);
    return this.http
      .patch(`${this.api}/${id}/statut`, {}, { params, responseType: 'text' })
      .pipe(map(() => void 0));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete(`${this.api}/${id}`, { responseType: 'text' })
      .pipe(map(() => void 0));
  }

  // ─── Gestion directe des techniciens ──────────────────────────────

  assignTechniciens(id: number, techniciensIds: number[]): Observable<any> {
    return this.http.post<any>(`${this.api}/${id}/techniciens`, techniciensIds).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  removeTechnicien(id: number, technicienId: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}/techniciens/${technicienId}`, {
      responseType: 'text' as 'json'
    });
  }

  // ─── Endpoints des Étapes (Step-by-Step) ──────────────────────────

  // Étape 1 : Récapitulatif
  getStepRecapitulatif(id: number): Observable<StepRecapitulatifResponseDto> {
    return this.http.get<any>(
      `${this.api}/${id}/step-recapitulatif`
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  // Étape 2 : Approvisionnement
  getStepApprovisionnement(id: number): Observable<StepApprovisionnementResponseDto> {
    return this.http.get<any>(
      `${this.api}/${id}/step-approvisionnement`
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  // Étape 3 : Bon de Sortie
  getStepBonSortie(id: number): Observable<StepBonSortieResponseDto> {
    return this.http.get<any>(
      `${this.api}/${id}/step-bon-sortie`
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  updateStepBonSortie(id: number, data?: any): Observable<void> {
    return this.http
      .put(`${this.api}/${id}/step-bon-sortie`, data || {}, { responseType: 'text' })
      .pipe(map(() => void 0));
  }

  // Étape 4 : Assignation Techniciens
  getStepAssignation(id: number): Observable<StepAssignationResponseDto> {
    return this.http.get<any>(
      `${this.api}/${id}/step-assignation`
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  updateStepAssignation(id: number, data: StepAssignationDto): Observable<void> {
    return this.http
      .put(`${this.api}/${id}/step-assignation`, data, { responseType: 'text' })
      .pipe(map(() => void 0));
  }

  // Étape 5 : Réparation
  getStepReparation(id: number): Observable<StepReparationResponseDto> {
    return this.http.get<any>(
      `${this.api}/${id}/step-reparation`
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  updateStepReparation(id: number, data: StepReparationDto): Observable<void> {
    return this.http
      .put(`${this.api}/${id}/step-reparation`, data, { responseType: 'text' })
      .pipe(map(() => void 0));
  }

  // Étape 6 : Paiement
  getStepPaiement(id: number): Observable<StepPaiementResponseDto> {
    return this.http.get<any>(
      `${this.api}/${id}/step-paiement`
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  // Étape 7 : Prêt à Livrer
  getStepPretALivrer(id: number): Observable<StepPretALivrerResponseDto> {
    return this.http.get<any>(
      `${this.api}/${id}/step-pret-a-livrer`
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  updateStepPretALivrer(id: number, data: StepPretALivrerDto): Observable<void> {
    return this.http
      .put(`${this.api}/${id}/step-pret-a-livrer`, data, { responseType: 'text' })
      .pipe(map(() => void 0));
  }

  // Étape 8 : Livraison
  getStepLivraison(id: number): Observable<StepLivraisonResponseDto> {
    return this.http.get<any>(
      `${this.api}/${id}/step-livraison`
    ).pipe(
      map((res: any) => (res && res.data !== undefined ? res.data : res))
    );
  }

  updateStepLivraison(id: number, data: StepLivraisonDto): Observable<void> {
    return this.http
      .put(`${this.api}/${id}/step-livraison`, data, { responseType: 'text' })
      .pipe(map(() => void 0));
  }
}
