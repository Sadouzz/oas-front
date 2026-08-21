import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrdreReparation, OrdreReparationRequest, StatutFiche, PieceJointeDiagnostic, TypePieceJointeDiagnostic } from '../shared/models';
import { RemarqueDiagnostic } from '../shared/models/ordre-reparation.model';

export type { OrdreReparation, OrdreReparationRequest, StatutFiche, PieceJointeDiagnostic, TypePieceJointeDiagnostic, RemarqueDiagnostic };

@Injectable({ providedIn: 'root' })
export class OrdreReparationService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/ordres-reparation`;

  getAll(): Observable<OrdreReparation[]> {
    return this.http.get<OrdreReparation[]>(this.api);
  }

  getById(id: number): Observable<OrdreReparation> {
    return this.http.get<OrdreReparation>(`${this.api}/${id}`);
  }

  create(data: OrdreReparationRequest): Observable<OrdreReparation> {
    return this.http.post<OrdreReparation>(`${this.api}/create`, data);
  }

  update(id: number, data: OrdreReparationRequest): Observable<OrdreReparation> {
    return this.http.put<OrdreReparation>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.api}/${id}`);
  }

  assignTechnicien(ficheId: number, technicienId: number): Observable<any> {
    return this.http.post(`${this.api}/${ficheId}/techniciens/${technicienId}`, {}, { responseType: 'text' as 'json' });
  }

  removeTechnicien(ficheId: number, technicienId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ficheId}/techniciens/${technicienId}`, { responseType: 'text' as 'json' });
  }

  assignTechnicienReparation(ficheId: number, technicienId: number): Observable<any> {
    return this.http.post(`${this.api}/${ficheId}/techniciens-reparation/${technicienId}`, {}, { responseType: 'text' as 'json' });
  }

  removeTechnicienReparation(ficheId: number, technicienId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ficheId}/techniciens-reparation/${technicienId}`, { responseType: 'text' as 'json' });
  }

  updateStatut(ficheId: number, statut: StatutFiche): Observable<OrdreReparation> {
    return this.http.patch<OrdreReparation>(`${this.api}/${ficheId}/statut`, null, { params: { statut } });
  }

  // ─── Pièces jointes de diagnostic ─────────────────────
  getPiecesJointesDiagnostic(ficheId: number, type?: TypePieceJointeDiagnostic): Observable<PieceJointeDiagnostic[]> {
    return this.http.get<PieceJointeDiagnostic[]>(`${this.api}/${ficheId}/diagnostic/pieces-jointes`, {
      params: type ? { type } : {},
    });
  }

  addPieceJointeDiagnostic(ficheId: number, data: { url: string; type: TypePieceJointeDiagnostic; remarque?: string | null }): Observable<PieceJointeDiagnostic> {
    return this.http.post<PieceJointeDiagnostic>(`${this.api}/${ficheId}/diagnostic/pieces-jointes`, data);
  }

  deletePieceJointeDiagnostic(ficheId: number, pieceJointeId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ficheId}/diagnostic/pieces-jointes/${pieceJointeId}`, { responseType: 'text' as 'json' });
  }

  // ─── Remarques de diagnostic ─────────────────────────────
  getRemarquesDiagnostic(ficheId: number): Observable<RemarqueDiagnostic[]> {
    return this.http.get<RemarqueDiagnostic[]>(`${this.api}/${ficheId}/diagnostic/remarques`);
  }
  addRemarqueDiagnostic(ficheId: number, contenu: string): Observable<RemarqueDiagnostic> {
    return this.http.post<RemarqueDiagnostic>(`${this.api}/${ficheId}/diagnostic/remarques`, { contenu });
  }
  deleteRemarqueDiagnostic(ficheId: number, remarqueId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ficheId}/diagnostic/remarques/${remarqueId}`, { responseType: 'text' as 'json' });
  }

  // ─── Lien Fiche Atelier → Ordre de réparation ─────────
  createFromFicheAtelier(ficheAtelierId: number): Observable<OrdreReparation> {
    return this.http.post<OrdreReparation>(`${this.api}/depuis-fiche-atelier/${ficheAtelierId}`, {});
  }

  existsForFicheAtelier(ficheAtelierId: number): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.api}/exists-for-fiche-atelier/${ficheAtelierId}`);
  }
}
