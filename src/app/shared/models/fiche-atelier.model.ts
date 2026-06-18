export type StatutReparation = 'A_FAIRE' | 'EN_DIAGNOSTIC' | 'EN_COURS' | 'TERMINE' | 'LIVRE';

export interface FicheAtelier {
  id: number;
  numero: string;
  descriptionTravaux: string;
  listeReception: string | null;
  listeDefauts: string | null;
  dateCreation: string;
  updatedAt: string;
  dateSortie: string | null;
  statut: StatutReparation;
  vehicule: {
    id: number;
    immatriculation: string;
    marque: string;
    modele: string;
    kilometrage?: number | null;
    client?: { id: number; firstName: string; lastName: string; phone?: string } | null;
  } | null;
  mecaniciens: { id: number; nom: string }[];
  bonDeSortie?: { id: number; reference: string; statut: string } | null;
}

export interface FicheAtelierRequest {
  numero: string;
  descriptionTravaux: string;
  listeReception?: string;
  listeDefauts?: string;
  dateSortie?: string;
  vehiculeId: number;
  statut?: StatutReparation;
}
