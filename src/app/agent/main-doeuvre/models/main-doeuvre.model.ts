import { CategorieMainDoeuvreModel } from '../categorie-main-doeuvre.service';

export type CategorieMainDoeuvre = string; // For backward compatibility if needed, but we shouldn't need it. We will use CategorieMainDoeuvreModel.

export interface MainDoeuvreModel {
  id: number;
  prix: number;
  description: string;
  categorie: CategorieMainDoeuvreModel;
  nbreHeure: number;
  isArchived: boolean;
}

export interface MainDoeuvreRequest {
  prix: number;
  description?: string;
  categorieId: number;
  nbreHeure: number;
}
