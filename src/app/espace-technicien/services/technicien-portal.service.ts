import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdreReparation, PieceJointeDiagnostic, TypePieceJointeDiagnostic, Technicien } from '../../shared/models';
import { RemarqueDiagnostic } from '../../shared/models/ordre-reparation.model';

@Injectable({ providedIn: 'root' })
export class TechnicienPortalService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/technicien/portal`;

  getMe(): Observable<Technicien> {
    return this.http.get<Technicien>(`${this.api}/me`);
  }

  getMesOrdresReparation(): Observable<OrdreReparation[]> {
    return this.http.get<OrdreReparation[]>(`${this.api}/ordres-reparation`);
  }

  getOrdreReparation(id: number): Observable<OrdreReparation> {
    return this.http.get<OrdreReparation>(`${this.api}/ordres-reparation/${id}`);
  }

  getPiecesJointesDiagnostic(id: number, type?: TypePieceJointeDiagnostic): Observable<PieceJointeDiagnostic[]> {
    return this.http.get<PieceJointeDiagnostic[]>(`${this.api}/ordres-reparation/${id}/diagnostic/pieces-jointes`, {
      params: type ? { type } : {},
    });
  }

  addPieceJointeDiagnostic(id: number, data: { url: string; type: TypePieceJointeDiagnostic; remarque?: string | null }): Observable<PieceJointeDiagnostic> {
    return this.http.post<PieceJointeDiagnostic>(`${this.api}/ordres-reparation/${id}/diagnostic/pieces-jointes`, data);
  }

  deletePieceJointeDiagnostic(id: number, pieceJointeId: number): Observable<any> {
    return this.http.delete(`${this.api}/ordres-reparation/${id}/diagnostic/pieces-jointes/${pieceJointeId}`, { responseType: 'text' as 'json' });
  }

  updatePannes(id: number, listeDefauts: string): Observable<OrdreReparation> {
    return this.http.put<OrdreReparation>(`${this.api}/ordres-reparation/${id}/pannes`, { listeDefauts });
  }

  proposerPiece(id: number, data: { pieceId: number; quantite: number }): Observable<any> {
    return this.http.post(`${this.api}/ordres-reparation/${id}/pieces`, data, { responseType: 'text' as 'json' });
  }

  proposerMainDoeuvre(id: number, data: { mainDoeuvreId: number; nbreHeure: number }): Observable<any> {
    return this.http.post(`${this.api}/ordres-reparation/${id}/main-doeuvre`, data, { responseType: 'text' as 'json' });
  }

  // ─── Remarques de diagnostic ─────────────────────────────
  getRemarquesDiagnostic(id: number): Observable<RemarqueDiagnostic[]> {
    return this.http.get<RemarqueDiagnostic[]>(`${this.api}/ordres-reparation/${id}/diagnostic/remarques`);
  }
  addRemarqueDiagnostic(id: number, contenu: string): Observable<RemarqueDiagnostic> {
    return this.http.post<RemarqueDiagnostic>(`${this.api}/ordres-reparation/${id}/diagnostic/remarques`, { contenu });
  }
  deleteRemarqueDiagnostic(id: number, remarqueId: number): Observable<any> {
    return this.http.delete(`${this.api}/ordres-reparation/${id}/diagnostic/remarques/${remarqueId}`, { responseType: 'text' as 'json' });
  }
}
