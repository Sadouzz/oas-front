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

export interface InventaireResponse {
  pieceId: number;
  reference: string;
  designation: string;
  stockMagasinTheorique: number;
  stockAtelierTheorique: number;
  stockMagasinPhysique: number;
  stockAtelierPhysique: number;
  ecartMagasin: number;
  ecartAtelier: number;
  ajuste: boolean;
  mouvement: PieceMouvementListResponse | null;
}
