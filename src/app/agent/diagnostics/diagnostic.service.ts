import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DiagnosticRequest,
  DiagnosticResponse,
  DiagnosticStepDto,
  PieceJointeDiagnostic,
  RemarqueDiagnostic,
  TypePieceJointeDiagnostic,
  StatutDiagnostic
} from './models/diagnostic.model';

@Injectable({ providedIn: 'root' })
export class DiagnosticService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/diagnostics`;

  /**
   * 1. CRUD de base
   */
  getAll(params?: { page?: number; size?: number; search?: string; statut?: StatutDiagnostic | string }): Observable<any> {
    let p = new HttpParams();
    if (params?.page !== undefined) p = p.set('page', params.page.toString());
    if (params?.size !== undefined) p = p.set('size', params.size.toString());
    if (params?.search) p = p.set('search', params.search);
    if (params?.statut) p = p.set('statut', params.statut);
    return this.http.get<any>(this.api, { params: p });
  }

  getById(id: number): Observable<DiagnosticResponse> {
    return this.http.get<DiagnosticResponse>(`${this.api}/${id}`);
  }

  getByOrdreReparationId(ordreReparationId: number): Observable<DiagnosticResponse | null> {
    return this.http.get<DiagnosticResponse>(`${this.api}/ordre-reparation/${ordreReparationId}`).pipe(
      catchError(() => of(null))
    );
  }

  create(data: DiagnosticRequest): Observable<DiagnosticResponse> {
    return this.http.post<DiagnosticResponse>(this.api, data);
  }

  update(id: number, data: DiagnosticRequest): Observable<DiagnosticResponse> {
    return this.http.put<DiagnosticResponse>(`${this.api}/${id}`, data);
  }

  updateStatut(id: number, statut: StatutDiagnostic): Observable<DiagnosticResponse> {
    return this.http.patch<DiagnosticResponse>(`${this.api}/${id}/statut`, { statut }, {
      params: { statut }
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.api}/${id}`);
  }

  /**
   * 2. Intégration Stepper / Étape 2
   */
  saveStep(data: DiagnosticStepDto): Observable<DiagnosticResponse> {
    return this.http.post<DiagnosticResponse>(`${this.api}/step`, data);
  }

  /**
   * 3. Pièces jointes & Remarques
   */
  addPieceJointe(diagnosticId: number, data: { url: string; type: TypePieceJointeDiagnostic; remarque?: string | null }): Observable<PieceJointeDiagnostic> {
    return this.http.post<PieceJointeDiagnostic>(`${this.api}/${diagnosticId}/pieces-jointes`, data);
  }

  deletePieceJointe(pieceJointeId: number): Observable<any> {
    return this.http.delete(`${this.api}/pieces-jointes/${pieceJointeId}`);
  }

  addRemarque(diagnosticId: number, data: { contenu: string; technicienId?: number | null }): Observable<RemarqueDiagnostic> {
    return this.http.post<RemarqueDiagnostic>(`${this.api}/${diagnosticId}/remarques`, data);
  }

  deleteRemarque(remarqueId: number): Observable<any> {
    return this.http.delete(`${this.api}/remarques/${remarqueId}`);
  }
}
