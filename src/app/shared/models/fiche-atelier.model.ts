export interface FicheAtelier {
  id: number;
  numero: string;
  descriptionTravaux: string;
  listeReception: string | null;
  listeDefauts: string | null;
  dateCreation: string;
  dateSortie: string | null;
  vehicule: { id: number; immatriculation: string; marque: string; modele: string } | null;
  mecaniciens: { id: number; nom: string }[];
}

export interface FicheAtelierRequest {
  numero: string;
  descriptionTravaux: string;
  listeReception?: string;
  listeDefauts?: string;
  dateSortie?: string;
  vehiculeId: number;
}
