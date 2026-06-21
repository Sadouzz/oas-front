export type StatutFiche = 'A_FAIRE' | 'EN_DIAGNOSTIC' | 'EN_ATTENTE_PROFORMA' | 'PROFORMA_VALIDE' | 'EN_ATTENTE_COMMANDE' | 'EN_ATTENTE_SORTIE' | 'EN_ATTENTE_MECANICIEN' | 'EN_COURS' | 'EN_ATTENTE_PAIEMENT' | 'TERMINE' | 'LIVRE';

export interface FicheAtelier {
  id: number;
  numero: string;
  descriptionTravaux: string;
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
  mecaniciens: { id: number; nom: string }[];
  mecaniciensReparation: { id: number; nom: string }[];
  bonDeSortie?: { id: number; reference: string; statut: string } | null;
  lignesFicheAtelierPieces?: {
    id: number;
    piece: { id: number; reference: string; prix?: number };
    quantite: number;
    prix: number;
  }[];
  lignesFicheAtelierMainDoeuvres?: {
    id: number;
    mainDoeuvre: { id: number; prix: number; nbreHeure: number; categorie?: { nom: string } };
    nbreHeure: number;
    prix: number;
  }[];
}

export interface FicheAtelierRequest {
  numero: string;
  descriptionTravaux: string;
  listeReception?: string;
  listeDefauts?: string;
  dateSortie?: string;
  vehiculeId: number;
  statut?: StatutFiche;
  lignesPieces?: { pieceId: number; quantite: number; prix?: number | null }[];
  lignesMainDoeuvres?: { mainDoeuvreId: number; nbreHeure: number; prix?: number | null }[];
}
