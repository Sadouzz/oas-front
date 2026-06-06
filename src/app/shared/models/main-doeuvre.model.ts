export type CategorieMainDoeuvre = 'MECANIQUE' | 'CARROSSERIE' | 'ELECTRIQUE' | 'PEINTURE';

export interface MainDoeuvreModel {
  id: number;
  prix: number;
  categorie: CategorieMainDoeuvre;
  nbreHeure: number;
  isArchived: boolean;
}

export interface MainDoeuvreRequest {
  prix: number;
  categorie: CategorieMainDoeuvre;
  nbreHeure: number;
}
