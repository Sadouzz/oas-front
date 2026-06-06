export interface Mecanicien {
  id: number;
  nom: string;
  createdAt: string;
  garage: { id: number; libelle: string; ville: string } | null;
}

export interface MecanicienRequest {
  nom: string;
  garageId?: number | null;
}
