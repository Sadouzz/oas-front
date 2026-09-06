export interface CategorieMainDoeuvreModel {
  id: number;
  nom: string;
}

export interface CategorieMainDoeuvreRequest {
  nom: string;
}

export type CategorieMainDoeuvre = string; // For backward compatibility if needed

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
