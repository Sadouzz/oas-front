export interface StockMouvement {
  id: number;
  type: string;
  quantite: number;
  stockMagasinAvant: number;
  stockAtelierAvant: number;
  stockMagasinApres: number;
  stockAtelierApres: number;
  stockReelApres?: number;
  prenom?: string;
  nom?: string;
  numDocument?: string;
  typeDocument?: string;
  numeroSerie?: string;
  immatriculation?: string;
  motif: string;
  dateOperation: string;
  piece: { id: number; designation: string; reference: string; numeroDeSerie?: string; categorie?: any } | null;
  agent: { id: number; username: string; firstName: string; lastName: string } | null;
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
  mouvement: StockMouvement | null;
}
