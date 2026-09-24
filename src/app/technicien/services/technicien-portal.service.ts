import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdreReparation, PieceJointeDiagnostic, TypePieceJointeDiagnostic, RemarqueDiagnostic, Technicien, extractContent } from '../../shared/models';

export interface VehiculeSummary {
  id?: number;
  immatriculation: string;
  marque: string;
  modele: string;
}

export interface OrdreReparationTechnicienSummary {
  id: number;
  numero: string;
  statut: string;
  dateCreation: string;
  vehicule?: VehiculeSummary;
}

@Injectable({ providedIn: 'root' })
export class TechnicienPortalService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/technicien/portal`;

  getMe(): Observable<Technicien> {
    return this.http.get<Technicien>(`${this.api}/me`);
  }

  getMesOrdresReparation(page: number = 0, size: number = 10): Observable<any> {
    const params: Record<string, string> = {
      page: page.toString(),
      size: size.toString()
    };
    return this.http.get<any>(`${this.api}/ordres-reparation`, { params });
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

  proposerPiece(id: number, data: { pieceId?: number | null; quantite: number; isCustom?: boolean; designationPds?: string; prix?: number }): Observable<any> {
    return this.http.post(`${this.api}/ordres-reparation/${id}/pieces`, data, { responseType: 'text' as 'json' });
  }

  supprimerPiece(id: number, pieceLigneId: number): Observable<any> {
    return this.http.delete(`${this.api}/ordres-reparation/${id}/pieces/${pieceLigneId}`, { responseType: 'text' as 'json' });
  }

  proposerMainDoeuvre(id: number, data: { mainDoeuvreId: number; nbreHeure: number; prix?: number }): Observable<any> {
    return this.http.post(`${this.api}/ordres-reparation/${id}/main-doeuvre`, data, { responseType: 'text' as 'json' });
  }

  supprimerMainDoeuvre(id: number, moLigneId: number): Observable<any> {
    return this.http.delete(`${this.api}/ordres-reparation/${id}/main-doeuvre/${moLigneId}`, { responseType: 'text' as 'json' });
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
