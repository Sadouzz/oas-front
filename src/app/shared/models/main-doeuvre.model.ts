import { CategorieMainDoeuvreModel } from '../../services/categorie-main-doeuvre.service';

export type CategorieMainDoeuvre = string; // For backward compatibility if needed, but we shouldn't need it. We will use CategorieMainDoeuvreModel.

export interface MainDoeuvreModel {
  id: number;
  prix: number;
  categorie: CategorieMainDoeuvreModel;
  nbreHeure: number;
  isArchived: boolean;
}

export interface MainDoeuvreRequest {
  prix: number;
  categorieId: number;
  nbreHeure: number;
}
