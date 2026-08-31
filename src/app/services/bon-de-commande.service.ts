import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type StatutBonCommande = 'EN_ATTENTE' | 'ENVOYE' | 'INCOMPLET' | 'RECU' | 'ANNULE';

export interface LigneBonDeCommande {
  id?: number;
  pieceDetacheeId?: number;
  designationPiece?: string;
  reference?: string;
  categorie?: string;
  quantite: number;
  quantiteRecue?: number;
  prixUnitaire: number;
  montant: number;
}

export interface BonDeCommande {
  id: number;
  numero: string;
  dateCommande: string;
  statut: StatutBonCommande;
  fournisseurId: number;
  fournisseurNom: string;
  vehiculeId: number | null;
  immatriculationVehicule: string | null;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  tvaApplicable: boolean;
  paye: boolean;
  observation: string | null;
  lignes: LigneBonDeCommande[];
}

export interface LigneBonDeCommandeRequest {
  id?: number;
  pieceDetacheeId?: number;
  quantite: number;
  prixUnitaire: number;
  designationPds?: string;
  typePiece?: string;
}

export interface BonDeCommandeRequest {
  fournisseurId?: number | null;
  vehiculeId?: number | null;
  tvaApplicable: boolean;
  observation?: string;
  lignes: LigneBonDeCommandeRequest[];
}

export interface ReceptionBonDeCommandeLigne {
  ligneId: number;
  quantiteRecue: number;
}

export interface ReceptionBonDeCommandeRequest {
  lignes: ReceptionBonDeCommandeLigne[];
}

@Injectable({ providedIn: 'root' })
export class BonDeCommandeService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/bons-de-commande`;

  getAll(): Observable<BonDeCommande[]> {
    return this.http.get<BonDeCommande[]>(this.api);
  }

  getById(id: number): Observable<BonDeCommande> {
    return this.http.get<BonDeCommande>(`${this.api}/${id}`);
  }

  search(keyword: string): Observable<BonDeCommande[]> {
    return this.http.get<BonDeCommande[]>(`${this.api}/search`, { params: { keyword } });
  }

  recent(): Observable<BonDeCommande[]> {
    return this.http.get<BonDeCommande[]>(`${this.api}/recent`);
  }

  create(data: BonDeCommandeRequest): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(this.api, data);
  }

  update(id: number, data: BonDeCommandeRequest): Observable<BonDeCommande> {
    return this.http.put<BonDeCommande>(`${this.api}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  envoyer(id: number): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/envoyer`, {});
  }

  receptionner(id: number): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/receptionner`, {});
  }

  annuler(id: number): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/annuler`, {});
  }

  assignerFournisseur(id: number, fournisseurId: number): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/assigner-fournisseur`, {}, { params: { fournisseurId } });
  }

  receptionnerAvecReception(id: number, data: ReceptionBonDeCommandeRequest): Observable<BonDeCommande> {
    return this.http.post<BonDeCommande>(`${this.api}/${id}/receptionner-reception`, data);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf`, { responseType: 'blob' });
  }
}
