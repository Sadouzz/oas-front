export interface PartenaireModel {
  id: number;
  nom: string;
  description: string;
  logo: string;
  type: 'LOCAL' | 'EXTERIEUR';
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
