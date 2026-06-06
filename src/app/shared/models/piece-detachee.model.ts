export interface PieceDetache {
  id: number;
  type: 'PDP' | 'PDG' | 'PDS';
  numeroDeSerie: string;
  reference: string;
  categorie: string;
  pourcentage: number;
  statut: 'ACTIF' | 'INACTIF';
  createdAt: string;
  qteReelle?: number;
  stockAtelier?: number;
  stockMagasin?: number;
  prix?: number;
  seuilMinimum?: number;
}

export interface PieceDetacheRequest {
  type: 'PDP' | 'PDG' | 'PDS';
  numeroDeSerie: string;
  reference: string;
  categorie: string;
  pourcentage: number;
  statut?: 'ACTIF' | 'INACTIF';
  stockMagasin?: number | null;
  prix?: number | null;
  seuilMinimum?: number | null;
}

export interface AlerteStock {
  pieceId: number;
  numeroDeSerie: string;
  reference: string;
  categorie: string;
  stockMagasin: number;
  stockAtelier: number;
  qteReelle: number;
  seuilApplique: number;
  typeAlerte: 'RUPTURE' | 'STOCK_FAIBLE';
}
