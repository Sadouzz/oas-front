export interface CategoriePiece {
  id?: number;
  nom: string;
  depot?: { id: number; nom?: string };
  isArchived?: boolean;
}

export interface Depot {
  id?: number;
  nom: string;
  description?: string;
  isArchived?: boolean;
}

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

export interface PieceMouvementListResponse {
  id: number;
  prenom?: string | null;
  nom?: string | null;
  numDoc?: string | null;
  typeDoc?: string | null;
  numeroSerie?: string | null;
  immatriculation?: string | null;
  designation?: string | null;
  action?: string | null;
  quantite?: number | null;
  stockMagasin?: number | null;
  stockAtelier?: number | null;
  stockReel?: number | null;
  date?: string | null;
}

export type TypeAlerte = 'RUPTURE' | 'STOCK_FAIBLE';

export interface AlerteStockResponse {
  pieceId: number;
  numeroDeSerie?: string | null;
  reference: string;
  designation?: string | null;
  categorie?: string | null;
  stockMagasin: number;
  stockAtelier: number;
  qteReelle: number;
  seuilApplique: number;
  typeAlerte: TypeAlerte;
}

export type AlerteStock = AlerteStockResponse;
