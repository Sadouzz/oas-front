export interface FactureModel {
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
  agentId: number;
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
  modePaiement?: string | null;
  lignesPieces: { id: number; pieceId: number; designationPiece: string; quantite: number; prix: number; montantTotal: number }[];
  lignesMainDoeuvres: { id: number; mainDoeuvreId: number; descriptionMainDoeuvre: string; nbreHeure: number; tarifHoraire: number; montantTotal: number }[];
  montantPaye: number;
  resteAPayer: number;
  statutPaiement: 'NON_PAYE' | 'PARTIEL' | 'PAYE';
  recus: import('../../gestion-recu/models/recu.model').RecuModel[];
  ordreReparationId?: number | null;
  numeroOrdreReparation?: string | null;
}

export interface FactureCreateRequest {
  clientId: number;
  vehiculeId: number;
  ordreReparationId: number;
  kilometrage?: number | null;
  remarque?: string | null;
  tvaRate?: number | null;
  montantTimbre?: number | null;
  montantAutre?: number | null;
  modePaiement: string;
}
