export interface StockMouvement {
  id: number;
  type: 'ENTREE' | 'SORTIE' | 'AJUSTEMENT' | 'INVENTAIRE';
  quantite: number;
  stockMagasinAvant: number;
  stockAtelierAvant: number;
  stockMagasinApres: number;
  stockAtelierApres: number;
  motif: string;
  dateOperation: string;
  piece: { id: number; designation: string; reference: string } | null;
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
