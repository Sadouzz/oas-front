import { UserModel } from './user.model';

export interface VehiculeModel {
  id: number;
  immatriculation: string;
  annee: number | null;
  modele: string;
  marque: string;
  kilometrage: number | null;
  numeroChassis: string;
  client: UserModel | null;
  createdAt: string;
}

export interface VehiculeRequest {
  immatriculation: string;
  annee: number | null;
  modele: string;
  marque: string;
  kilometrage: number | null;
  numeroChassis: string;
  clientId: number | null;
}
