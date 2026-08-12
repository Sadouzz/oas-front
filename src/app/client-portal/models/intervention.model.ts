export interface Intervention {
  id: number;
  numero: string;
  descriptionTravaux: string;
  listeReception: string;
  listeDefauts: string;
  dateCreation: string;
  updatedAt: string;
  dateSortie: string | null;
  statut: string;
  vehicule: { id: number; immatriculation: string; marque: string; modele: string } | null;
  mecaniciens: { id: number; nom: string }[];
  lignesOrdreReparationPieces: { id: number; piece: { reference: string }; quantite: number; prix: number }[];
  lignesOrdreReparationMainDoeuvres: { id: number; mainDoeuvre: { description: string }; nbreHeure: number; prix: number }[];
}
