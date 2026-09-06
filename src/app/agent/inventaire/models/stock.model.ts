import { PieceMouvementListResponse } from "../../pieces-detachees/models/piece-detachee.model";


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
