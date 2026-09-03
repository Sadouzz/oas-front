export interface BonDeSortieHistoriqueListResponse {
  id: number;
  prenom?: string;
  nom?: string;
  numBs?: string;
  numeroSerie?: string;
  immatriculation?: string;
  designation?: string;
  action?: string;
  quantite?: number;
  stockMagasin?: number;
  stockAtelier?: number;
  qteReelle?: number;
  dateAction: string;
  // bonDeSortieId?: number;
}

export type BonDeSortieHistorique = BonDeSortieHistoriqueListResponse;
