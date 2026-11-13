export interface FactureModel {
  id: number;
  numero: string;
  dateCreation: string;
  dateModification: string;
  montantHT: number;
  montantTVA: number;
  tvaApplicable?: boolean | null;
  montantTTC: number;
  montantTimbre: number;
  timbreFiscalRate?: number | null;
  montantAutre: number;
  montantTotal: number;
  tauxRemiseClient?: number | null;
  montantRemiseClient?: number | null;
  agentId: number;
  agentNom: string;
  remarque: string | null;
  kilometrage: number;
  clientId: number;
  clientNom: string;
  clientNumero?: string | null;
  numeroClient?: string | null;
  clientMatricule?: string | null;
  vehiculeId: number | null;
  immatriculation: string | null;
  vehiculeImmatriculation?: string | null;
  numeroChassis: string | null;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  numeroBonDeCommande: string | null;
  modePaiement?: string | null;
  lignesPieces: {
    id: number;
    pieceId?: number | null;
    designationPiece: string;
    designationPds?: string | null;
    type?: string | null;
    typePiece?: string | null;
    isCustom?: boolean | null;
    referencePiece?: string | null;
    quantite: number;
    prix: number;
    montantTotal: number;
    tauxRemise?: number;
    dateHeureSaisie?: string | null;
  }[];
  lignesMainDoeuvres: { id: number; mainDoeuvreId: number; descriptionMainDoeuvre: string; nbreHeure: number; tarifHoraire: number; montantTotal: number; tauxRemise?: number; dateHeureSaisie?: string | null }[];
  montantPaye: number;
  resteAPayer: number;
  statutPaiement: 'NON_PAYE' | 'PARTIEL' | 'PAYE';
  recus: import('../../gestion-recu/models/recu.model').RecuModel[];
  ordreReparationId?: number | null;
  numeroOrdreReparation?: string | null;
}

export type FactureListModel = Pick<FactureModel,
  'id' | 'numero' | 'dateCreation' | 'montantHT' | 'montantTVA' | 'tvaApplicable' | 'montantTTC'
  | 'montantTimbre' | 'timbreFiscalRate' | 'montantAutre' | 'montantTotal' | 'tauxRemiseClient'
  | 'montantRemiseClient' | 'modePaiement' | 'agentNom' | 'remarque' | 'kilometrage' | 'clientId' | 'clientNom'
  | 'clientNumero' | 'numeroClient' | 'clientMatricule' | 'immatriculation' | 'vehiculeImmatriculation'
  | 'marque' | 'modele' | 'annee' | 'montantPaye' | 'resteAPayer' | 'statutPaiement'>;

export type FactureDetailsViewModel = FactureListModel & Pick<FactureModel,
  'lignesPieces' | 'lignesMainDoeuvres' | 'recus'> & Partial<Pick<FactureModel,
    'dateModification' | 'agentId' | 'vehiculeId' | 'numeroChassis' | 'numeroBonDeCommande'
    | 'modePaiement' | 'ordreReparationId' | 'numeroOrdreReparation'>>;

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
  appliquerTVA?: boolean;
  pdfTemplateId?: number | null;
  pdfLayoutKey?: 'AVEC_ENTETE' | 'SANS_ENTETE';
}
