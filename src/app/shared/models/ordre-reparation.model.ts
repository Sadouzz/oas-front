export type StatutFiche = 'A_FAIRE' | 'EN_DIAGNOSTIC' | 'EN_ATTENTE_PROFORMA' | 'PROFORMA_VALIDE' | 'EN_ATTENTE_COMMANDE' | 'EN_ATTENTE_SORTIE' | 'EN_ATTENTE_MECANICIEN' | 'EN_COURS' | 'EN_ATTENTE_PAIEMENT' | 'TERMINE' | 'LIVRE';

export type TypePieceJointeDiagnostic = 'PHOTO' | 'PDF';

export interface PieceJointeDiagnostic {
  id: number;
  ordreReparationId: number;
  url: string;
  type: TypePieceJointeDiagnostic;
  remarque: string | null;
  createdAt: string;
}

export interface LigneReceptionOrdre {
  nom: string;
  etat: boolean | null;
  /** true = ligne provenant de la fiche atelier d'origine : désignation non modifiable, non supprimable. */
  verrouille: boolean;
}

export interface LigneTravailOrdre {
  nom: string;
  /** true = ligne provenant de la désignation des travaux de la fiche atelier d'origine : non modifiable, non supprimable. */
  verrouille: boolean;
}

export interface OrdreReparation {
  id: number;
  numero: string;
  descriptionTravaux: string;
  lignesTravaux: LigneTravailOrdre[] | null;
  lignesReception: LigneReceptionOrdre[] | null;
  listeDefauts: string | null;
  dateCreation: string;
  updatedAt: string;
  dateSortie: string | null;
  statut: StatutFiche;
  vehicule: {
    id: number;
    immatriculation: string;
    marque: string;
    modele: string;
    kilometrage?: number | null;
    client?: { id: number; firstName: string; lastName: string; phone?: string } | null;
  } | null;
  techniciens: { id: number; firstName: string; lastName: string; specialite?: string | null }[];
  techniciensReparation: { id: number; firstName: string; lastName: string; specialite?: string | null }[];
  bonDeSortie?: { id: number; reference: string; statut: string } | null;
  lignesOrdreReparationPieces?: {
    id: number;
    piece: { id: number; reference: string; prix?: number };
    quantite: number;
    prix: number;
  }[];
  lignesOrdreReparationMainDoeuvres?: {
    id: number;
    mainDoeuvre: { id: number; prix: number; nbreHeure: number; categorie?: { nom: string } };
    nbreHeure: number;
    prix: number;
  }[];
}

export interface OrdreReparationRequest {
  numero: string;
  descriptionTravaux: string;
  lignesTravaux?: LigneTravailOrdre[];
  lignesReception?: LigneReceptionOrdre[];
  listeDefauts?: string;
  dateSortie?: string;
  vehiculeId: number;
  statut?: StatutFiche;
  lignesPieces?: { 
    pieceId?: number | null; 
    quantite: number; 
    prix?: number | null;
    isCustom?: boolean;
    designationPds?: string;
  }[];
  lignesMainDoeuvres?: { mainDoeuvreId: number; nbreHeure: number; prix?: number | null }[];
}
