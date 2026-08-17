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

export interface OrdreReparation {
  id: number;
  numero: string;
  descriptionTravaux: string;
  travauxDemandes: string | null;
  listeReception: string | null;
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
  travauxDemandes?: string;
  listeReception?: string;
  listeDefauts?: string;
  dateSortie?: string;
  vehiculeId: number;
  statut?: StatutFiche;
  lignesPieces?: { pieceId: number; quantite: number; prix?: number | null }[];
  lignesMainDoeuvres?: { mainDoeuvreId: number; nbreHeure: number; prix?: number | null }[];
}
