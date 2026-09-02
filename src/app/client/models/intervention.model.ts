export interface Intervention {
  id: number;
  numero: string;
  descriptionTravaux: string;
  lignesReception: { nom: string; etat: boolean | null; verrouille: boolean }[];
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
