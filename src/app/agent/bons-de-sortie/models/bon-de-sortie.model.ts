export interface LigneBonDeSortie {
  id: number;
  piece: { id: number; reference: string; designation?: string; numeroDeSerie?: string; prix?: number; stockMagasin?: number; stockAtelier?: number } | null;
  mainDoeuvreId?: number | null;
  type?: 'PDP' | 'PDG' | 'PDS' | 'MAIN_DOEUVRE';
  designation?: string;
  quantite: number;
  prix?: number;
}


export interface BonDeSortieHistorique {
  id: number;
  statut?: string;
  action?: string;
  motif?: string;
  dateAction: string;
  prenom?: string;
  nom?: string;
  numBs?: string;
  numeroSerie?: string;
  immatriculation?: string;
  designation?: string;
  bonDeSortieId?: number;
  bonDeSortie?: BonDeSortie;
  piece?: {
    id: number;
    reference: string;
    designation?: string;
  };
  quantite?: number;
  stockMagasin?: number;
  stockAtelier?: number;
  qteReelle?: number;
  agent?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}


export interface BonDeSortie {
  id: number;
  reference: string;
  date: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | string;
  remarque: string;
  dateValidation: string | null;
  client: { id: number; firstName: string; lastName: string; phone: string } | null;
  vehicule: { id: number; immatriculation: string; marque: string; modele: string } | null;
  agentEmetteur: { id: number; username: string; firstName: string; lastName: string } | null;
  agentValidateur?: { id: number; username: string; firstName: string; lastName: string };
  ordreReparationId?: number | null;
  ordreReparation?: { id: number; numero: string } | null;
  ordreTravailId?: number | null;
  ordreTravail?: { id: number; numero: string } | null;
  lignesBonDeSortiePieces: LigneBonDeSortie[] | null;
  ordreReparationStatut?: string;
  ordreTravailStatut?: string;
  montantTotalPieces?: number;
  montantTotalMainDoeuvre?: number;
  montantTotal?: number;
}

export type BonDeSortieListResponse = BonDeSortie;

export interface BonDeSortieRequest {
  clientId: number;
  vehiculeId: number;
  ordreReparationId?: number;
  ordreTravailId?: number;
  lignesPieces: {
    pieceId?: number | null;
    quantite: number;
    prix?: number | null;
    prixUnitaire?: number | null;
    isCustom?: boolean;
    designationPds?: string;
    type?: 'PDP' | 'PDG' | 'PDS' | 'MAIN_DOEUVRE';
    mainDoeuvreId?: number | null;
    designation?: string;
  }[];
  remarque?: string;
}
