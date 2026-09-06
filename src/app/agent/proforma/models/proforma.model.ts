export interface LignePiece {
  id: number;
  pieceId?: number;
  designationPiece?: string;
  isCustom?: boolean;
  designationPds?: string;
  quantite: number;
  prix: number;
  montantTotal: number;
}

export interface LigneMD {
  id: number;
  mainDoeuvreId: number;
  descriptionMainDoeuvre: string;
  nbreHeure: number;
  tarifHoraire: number;
  montantTotal: number;
}

export interface Proforma {
  id: number;
  numero: string;
  dateCreation: string;
  dateModification: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantTimbre: number;
  montantAutre: number;
  montantTotal: number;
  agentNom: string;
  remarque: string | null;
  kilometrage: number;
  clientId: number;
  clientNom: string;
  vehiculeId: number | null;
  immatriculation: string | null;
  numeroChassis: string | null;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  numeroBonDeCommande: string | null;
  statut?: string;
  visibleClient?: boolean;
  lignesPieces: LignePiece[];
  lignesMainDoeuvres: LigneMD[];
}

export interface ProformaRequest {
  clientId: number;
  ordreReparationId?: number | null;
  vehiculeId?: number | null;
  kilometrage: number;
  immatriculation?: string;
  numeroChassis?: string;
  marque?: string;
  modele?: string;
  annee?: number | null;
  numeroBonDeCommande?: string;
  remarque?: string;
  tvaRate?: number | null;
  montantTimbre?: number;
  montantAutre?: number;
  lignesPieces: { pieceId: number; quantite: number; prix: number }[];
  lignesMainDoeuvres: { mainDoeuvreId: number; nbreHeure: number; tarifHoraire: number }[];
}

export interface LignePieceRequest {
  pieceId?: number | null;
  reference?: string | null;
  designation?: string | null;
  quantite: number;
  remisePourcentage?: number | null;
  prixUnitaire: number;
}

export interface LigneMainDoeuvreRequest {
  reference?: string | null;
  designation?: string | null;
  heures: number;
  prixUnitaire: number;
}

export interface ProformaResponse {
  id: number;
  numero: string;
  date: string;
  clientId: number;
  clientNom?: string | null;
  clientTelephone?: string | null;
  clientEmail?: string | null;
  clientVille?: string | null;
  bonDeCommandeNumero?: string | null;
  vehicule?: { annee?: number; marque?: string; modele?: string; immatriculation?: string; kilometrage?: number; numeroChassie?: string } | null;
  lignesPieces?: Array<{ id?: number; reference?: string; designation?: string; quantite?: number; remisePourcentage?: number; prixUnitaire?: number; total?: number }> | null;
  lignesMainDoeuvre?: Array<{ id?: number; reference?: string; designation?: string; heures?: number; prixUnitaire?: number; total?: number }> | null;
  montantHT?: number;
  montantTVA?: number;
  timbre?: number;
  montantTTC?: number;
  observation?: string | null;
}
