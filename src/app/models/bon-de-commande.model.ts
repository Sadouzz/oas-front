export interface LigneBonDeCommandeRequest {
  pieceDetacheeId?: number | null;
  typePiece?: 'PDP' | 'PDG' | 'PDS' | null;
  numeroDeSerie?: string | null;
  reference?: string | null;
  categorie?: string | null;
  pourcentage?: number | null;
  designationPds?: string | null;
  quantite: number;
  prixUnitaire: number;
}

export interface BonDeCommandeCreateRequest {
  fournisseurId: number;
  vehiculeId?: number | null;
  tvaApplicable?: boolean | null;
  observation?: string | null;
  lignes: LigneBonDeCommandeRequest[];
}

export interface LigneBonDeCommandeResponse {
  id?: number;
  pieceDetacheeId?: number | null;
  designation?: string | null;
  quantite?: number;
  prixUnitaire?: number;
}

export interface BonDeCommandeResponse {
  id: number;
  numero: string;
  dateCommande: string;
  statut: string;
  fournisseurId: number;
  fournisseurNom?: string | null;
  vehiculeId?: number | null;
  immatriculationVehicule?: string | null;
  montantHT?: number | null;
  montantTVA?: number | null;
  montantTTC?: number | null;
  tvaApplicable?: boolean | null;
  paye?: boolean | null;
  observation?: string | null;
  lignes?: LigneBonDeCommandeResponse[] | null;
}
