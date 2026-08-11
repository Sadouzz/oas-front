export interface Produit {
  id: number;
  nom: string;
  description: string;
  prix: number;
  mediaUrl: string | null;
  disponible: boolean;
  archive: boolean;
}

export type StatutDemandeProduit = 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | 'COMMANDEE' | 'ANNULEE' | 'LIVREE';

export interface DemandeProduit {
  id: number;
  produit: Produit;
  quantite: number;
  message: string | null;
  statut: StatutDemandeProduit;
  dateCreation: string;
}

export interface DemandeProduitRequest {
  produitId: number;
  quantite: number;
  message?: string | null;
}
