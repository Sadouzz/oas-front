export interface StockMouvement {
  id: number;
  type: string;
  quantite: number;
  stockMagasinAvant: number;
  stockAtelierAvant: number;
  stockMagasinApres: number;
  stockAtelierApres: number;
  stockReelApres?: number | null;
  prenom?: string | null;
  nom?: string | null;
  numDocument?: string | null;
  typeDocument?: string | null;
  numeroSerie?: string | null;
  immatriculation?: string | null;
  motif: string;
  dateOperation: string;
  piece: {
    id: number;
    designation: string;
    reference: string;
    numero?: string;
    numeroDeSerie?: string;
    prixUnitaire?: number | null;
    prixGros?: number | null;
    qteReelle?: number;
    stockMagasin?: number;
    stockAtelier?: number;
    seuilMinimum?: number;
    statut?: string;
    type?: string;
    categorie?: any;
    garage?: any;
  } | null;
  agent: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role?: string;
    matricule?: string;
  } | null;
  garage?: any;
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
