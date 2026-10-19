export interface LigneFacturationPiece {
  id: number;
  pieceId: number;
  designationPiece: string;
  referencePiece?: string;
  depotNom?: string;
  quantite: number;
  prix: number;
  montantTotal: number;
  quantiteCommandee?: number;
  quantiteRecueTotale?: number;
  quantiteRestante?: number;
}

export interface LigneFacturationMainDoeuvre {
  id: number;
  mainDoeuvreId: number;
  descriptionMainDoeuvre: string;
  nbreHeure: number;
  tarifHoraire: number;
  montantTotal: number;
}

export interface BonDeReception {
  id: number;
  numero: string;
  dateCreation: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantTimbre: number;
  montantTotal: number;
  agentNom: string;
  remarque: string | null;
  kilometrage: number;
  bonDeCommandeId: number | null;
  bonDeCommandeNumero: string | null;
  bonDeCommandeMontantTTC?: number | null;
  fournisseurNom?: string | null;
  referenceFactureFournisseur?: string | null;
  statut?: string | null;
  vehiculeImmatriculation?: string | null;
  vehiculeMarque?: string | null;
  vehiculeModele?: string | null;
  clientPrenom?: string | null;
  clientNom?: string | null;
  clientTelephone?: string | null;
  lignesPieces: LigneFacturationPiece[];
  lignesMainDoeuvres: LigneFacturationMainDoeuvre[];
}

export interface BonDeReceptionRequest {
  bonDeCommandeId?: number | null;
  kilometrage: number;
  remarque?: string;
  lignesPieces: { pieceId: number; quantite: number; prix: number }[];
  lignesMainDoeuvres: { mainDoeuvreId: number; nbreHeure: number; tarifHoraire: number }[];
}
