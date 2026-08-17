export type Specialite =
  | 'MECANIQUE_GENERALE'
  | 'ELECTRICITE_AUTO'
  | 'CARROSSERIE_PEINTURE'
  | 'TOLERIE'
  | 'CLIMATISATION'
  | 'DIAGNOSTIC_ELECTRONIQUE'
  | 'PNEUMATIQUE';

export interface Technicien {
  id: number;
  matricule: string;
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  adresse: string | null;
  specialite: Specialite | null;
  enabled: boolean;
  createdAt: string;
  garage?: { id: number; nom: string } | null;
}

export interface TechnicienRequest {
  username?: string;
  password?: string;
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  adresse?: string | null;
  specialite?: Specialite | null;
  garageId?: number | null;
}
