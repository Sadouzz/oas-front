export interface NoteDePrixModel {
  id: number;
  numero: string;
  dateCreation: string;
  dateModification?: string;
  montantHT: number;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
  statutPaiement?: 'NON_PAYE' | 'PARTIEL' | 'PAYE' | string;
  statut?: string;
  agentId?: number;
  agentNom?: string;
  remarque?: string | null;
  kilometrage?: number;
  clientId?: number | null;
  clientNom?: string | null;
  vehiculeId?: number | null;
  vehiculeImmatriculation?: string | null;
  immatriculation?: string | null;
  numeroChassis?: string | null;
  marque?: string | null;
  modele?: string | null;
  numeroBonDeCommande?: string | null;
  modePaiement?: string | null;
  montantAutre?: number;
  ordreReparationId?: number | null;
  numeroOrdreReparation?: string | null;
  lignesPieces: { id: number; pieceId: number; designationPiece: string; quantite: number; prix: number; montantTotal: number }[];
  lignesMainDoeuvres: { id: number; mainDoeuvreId: number; descriptionMainDoeuvre: string; nbreHeure: number; tarifHoraire: number; montantTotal: number }[];
}

export interface NoteDePrixCreateRequest {
  clientId?: number | null;
  vehiculeId?: number | null;
  ordreReparationId?: number | null;
  kilometrage?: number | null;
  numeroBonDeCommande?: string | null;
  remarque?: string | null;
  modePaiement?: string | null;
  montantAutre?: number | null;
  lignesPieces?: { pieceId: number; quantite: number; prix: number }[];
  lignesMainDoeuvres?: { mainDoeuvreId: number; nbreHeure: number; tarifHoraire: number }[];
}
