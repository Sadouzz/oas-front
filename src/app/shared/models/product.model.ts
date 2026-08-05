export interface Product {
  id: string;
  nom: string;
  description: string;
  prix: number;
  images: string[];
  categorie?: 'Vehicules' | 'Pieces' | 'Accessoires';
  isVedette?: boolean;
  videos?: string[];
}
