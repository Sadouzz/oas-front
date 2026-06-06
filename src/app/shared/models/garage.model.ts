export interface Garage {
  id: number;
  libelle: string;
  ville: string;
  adresse: string;
  contact: string;
  createdAt: string;
}

export interface GarageRequest {
  libelle: string;
  ville: string;
  adresse: string;
  contact: string;
}
