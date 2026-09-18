import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdreReparation, OrdreReparationRequest, StatutOrdre, PieceJointeDiagnostic, TypePieceJointeDiagnostic, RemarqueDiagnostic } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class OrdreReparationService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/ordres-reparation`;

  getAll(params?: import('../../shared/models').PageParams & { statut?: string; dateDebut?: string; dateFin?: string }): Observable<any> {
    const p: Record<string, string> = {};
    if (params?.statut) p['statut'] = params.statut;
    if (params?.dateDebut) p['dateDebut'] = params.dateDebut;
    if (params?.dateFin) p['dateFin'] = params.dateFin;
    if (params?.page !== undefined) p['page'] = params.page.toString();
    if (params?.size !== undefined) p['size'] = params.size.toString();
    if (params?.keyword) p['keyword'] = params.keyword;
    return this.http.get<any>(this.api, { params: p });
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

  assignTechnicien(ordreId: number, technicienId: number): Observable<any> {
    return this.http.post(`${this.api}/${ordreId}/techniciens/${technicienId}`, {}, { responseType: 'text' as 'json' });
  }

  removeTechnicien(ordreId: number, technicienId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ordreId}/techniciens/${technicienId}`, { responseType: 'text' as 'json' });
  }

  assignTechnicienReparation(ordreId: number, technicienId: number): Observable<any> {
    return this.http.post(`${this.api}/${ordreId}/techniciens-reparation/${technicienId}`, {}, { responseType: 'text' as 'json' });
  }

  removeTechnicienReparation(ordreId: number, technicienId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ordreId}/techniciens-reparation/${technicienId}`, { responseType: 'text' as 'json' });
  }

  updateStatut(ordreId: number, statut: StatutOrdre): Observable<OrdreReparation> {
    return this.http.patch<OrdreReparation>(`${this.api}/${ordreId}/statut`, { statut }, { params: { statut } });
  }

  // ─── Pièces jointes de diagnostic ─────────────────────
  getPiecesJointesDiagnostic(ordreId: number, type?: TypePieceJointeDiagnostic): Observable<PieceJointeDiagnostic[]> {
    return this.http.get<PieceJointeDiagnostic[]>(`${this.api}/${ordreId}/diagnostic/pieces-jointes`, {
      params: type ? { type } : {},
    });
  }

  addPieceJointeDiagnostic(ordreId: number, data: { url: string; type: TypePieceJointeDiagnostic; remarque?: string | null }): Observable<PieceJointeDiagnostic> {
    return this.http.post<PieceJointeDiagnostic>(`${this.api}/${ordreId}/diagnostic/pieces-jointes`, data);
  }

  deletePieceJointeDiagnostic(ordreId: number, pieceJointeId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ordreId}/diagnostic/pieces-jointes/${pieceJointeId}`, { responseType: 'text' as 'json' });
  }

  // ─── Remarques de diagnostic ─────────────────────────────
  getRemarquesDiagnostic(ordreId: number): Observable<RemarqueDiagnostic[]> {
    return this.http.get<RemarqueDiagnostic[]>(`${this.api}/${ordreId}/diagnostic/remarques`);
  }
  addRemarqueDiagnostic(ordreId: number, contenu: string): Observable<RemarqueDiagnostic> {
    return this.http.post<RemarqueDiagnostic>(`${this.api}/${ordreId}/diagnostic/remarques`, { contenu });
  }
  deleteRemarqueDiagnostic(ordreId: number, remarqueId: number): Observable<any> {
    return this.http.delete(`${this.api}/${ordreId}/diagnostic/remarques/${remarqueId}`, { responseType: 'text' as 'json' });
  }

  // ─── Lien Fiche Atelier → Ordre de réparation ─────────
  createFromFicheAtelier(ficheAtelierId: number): Observable<OrdreReparation> {
    return this.http.post<OrdreReparation>(`${this.api}/depuis-fiche-atelier/${ficheAtelierId}`, {});
  }

  existsForFicheAtelier(ficheAtelierId: number): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.api}/exists-for-fiche-atelier/${ficheAtelierId}`);
  }
}
