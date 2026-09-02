export interface PieceDetache {
  id: number;
  type: 'PDP' | 'PDG' | 'PDS';
  numero: string;
  reference: string;
  designation: string;
  categorie: any;
  pourcentage?: number;
  statut?: 'ACTIF' | 'ARCHIVE';
  createdAt: string;
  qteReelle?: number;
  stockAtelier?: number;
  stockMagasin?: number;
  prix?: number;
  prixUnitaire?: number;
  seuilMinimum?: number;
  estUtilise?: boolean;
}

export interface PieceDetacheRequest {
  type: 'PDP' | 'PDG';
  reference: string;
  designation: string;
  categorie: string;
  pourcentage?: number;
  statut?: 'ACTIF' | 'INACTIF';
  stockMagasin?: number | null;
  prix?: number | null;
  seuilMinimum?: number | null;
}

export interface AlerteStock {
  pieceId: number;
  reference: string;
  designation: string;
  categorie: string;
  stockMagasin: number;
  stockAtelier: number;
  qteReelle: number;
  seuilApplique: number;
  typeAlerte: 'RUPTURE' | 'STOCK_FAIBLE';
}
