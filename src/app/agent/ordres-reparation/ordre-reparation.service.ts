import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  OrdreReparation, 
  OrdreReparationRequest,
  StatutOrdre, 
  PieceJointeDiagnostic, 
  TypePieceJointeDiagnostic,
  RemarqueDiagnostic, 
  PageParams,
  StepReceptionDto,
  StepDiagnosticDto,
  StepPiecesMoDto,
  StepProformaDto,
  StepApprovisionnementDto,
  StepBonSortieDto,
  StepAssignationDto,
  StepReparationDto,
  StepPaiementDto,
  StepPretALivrerDto,
  StepLivraisonDto
} from '../../shared/models';

import {
  StepReceptionResponseDto,
  StepDiagnosticResponseDto,
  StepPiecesMoResponseDto,
  StepProformaResponseDto
} from './models/responses';

@Injectable({ providedIn: 'root' })
export class OrdreReparationService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/ordres-reparation`;

  getAll(params?: PageParams & { statut?: string; dateDebut?: string; dateFin?: string; search?: string }): Observable<any> {
    const p: Record<string, string> = {};
    if (params?.statut) {
      p['statut'] = params.statut;
      p['status'] = params.statut;
    }
    if (params?.dateDebut) {
      p['dateDebut'] = params.dateDebut;
      p['startDate'] = params.dateDebut;
    }
    if (params?.dateFin) {
      p['dateFin'] = params.dateFin;
      p['endDate'] = params.dateFin;
    }
    if (params?.page !== undefined) p['page'] = params.page.toString();
    if (params?.size !== undefined) p['size'] = params.size.toString();
    if (params?.keyword) {
      p['keyword'] = params.keyword;
      p['search'] = params.keyword;
    }
    return this.http.get<any>(this.api, { params: p });
  }

  private orderCache = new Map<number, { data: Observable<OrdreReparation>, timestamp: number }>();

  getById(id: number): Observable<OrdreReparation> {
    const now = Date.now();
    const cached = this.orderCache.get(id);
    if (cached && now - cached.timestamp < 1000) {
      return cached.data;
    }
    const request = this.http.get<OrdreReparation>(`${this.api}/${id}`).pipe(
      shareReplay(1)
    );
    this.orderCache.set(id, { data: request, timestamp: now });
    return request;
  }

  getSummary(id: number): Observable<any> {
    const now = Date.now();
    const cached = this.orderCache.get(id);
    if (cached && now - cached.timestamp < 1000) {
      return cached.data;
    }
    const request = this.http.get<any>(`${this.api}/${id}/summary`).pipe(
      shareReplay(1)
    );
    this.orderCache.set(id, { data: request, timestamp: now });
    return request;
  }

  create(data: OrdreReparationRequest): Observable<OrdreReparation> {
    return this.http.post<OrdreReparation>(`${this.api}/create`, data);
  }

  update(id: number, data: OrdreReparationRequest | any): Observable<void> {
    return this.http.put(`${this.api}/${id}`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // ─── Mises à jour par étape ─────────────────────────────
  
  // 1. Réception
  getStepReception(id: number): Observable<StepReceptionResponseDto> {
    return this.http.get<StepReceptionResponseDto>(`${this.api}/${id}/step-reception`);
  }

  updateStepReception(id: number, data: StepReceptionDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-reception`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 2. Diagnostic
  getStepDiagnostic(id: number): Observable<StepDiagnosticResponseDto> {
    return this.http.get<StepDiagnosticResponseDto>(`${this.api}/${id}/step-diagnostic`);
  }

  updateStepDiagnostic(id: number, data: StepDiagnosticDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-diagnostic`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 3. Pièces & MO
  getStepPiecesMo(id: number): Observable<StepPiecesMoResponseDto> {
    return this.http.get<StepPiecesMoResponseDto>(`${this.api}/${id}/step-pieces-mo`);
  }

  updateStepPiecesMo(id: number, data: StepPiecesMoDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-pieces-mo`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 4. Proforma
  getStepProforma(id: number): Observable<StepProformaResponseDto> {
    return this.http.get<StepProformaResponseDto>(`${this.api}/${id}/step-proforma`);
  }

  updateStepProforma(id: number, data: StepProformaDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-proforma`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 5. Approvisionnement (Bon de Commande)
  updateStepApprovisionnement(id: number, data: StepApprovisionnementDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-approvisionnement`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 6. Attente BS (Bon de Sortie)
  updateStepBonSortie(id: number, data: StepBonSortieDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-bon-sortie`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 7. Assignation Technicien
  updateStepAssignation(id: number, data: StepAssignationDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-assignation`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 8. Réparation
  updateStepReparation(id: number, data: StepReparationDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-reparation`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 9. Paiement
  updateStepPaiement(id: number, data: StepPaiementDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-paiement`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 10. Prêt à livrer
  updateStepPretALivrer(id: number, data: StepPretALivrerDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-pret-a-livrer`, data, { responseType: 'text' }).pipe(map(() => void 0));
  }

  // 11. Livré
  updateStepLivraison(id: number, data: StepLivraisonDto): Observable<void> {
    return this.http.put(`${this.api}/${id}/step-livraison`, data, { responseType: 'text' }).pipe(map(() => void 0));
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

  updateStatut(ordreId: number, statut: StatutOrdre): Observable<void> {
    return this.http.patch(`${this.api}/${ordreId}/statut`, { statut }, { params: { statut }, responseType: 'text' }).pipe(map(() => void 0));
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
