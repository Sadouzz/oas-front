export interface LigneBonDeSortie {
  id: number;
  piece: { id: number; reference: string; numeroDeSerie: string; prix?: number } | null;
  quantite: number;
}



export interface BonDeSortie {
  id: number;
  reference: string;
  date: string;
  statut: 'EN_ATTENTE' | 'VALIDE';
  remarque: string;
  dateValidation: string | null;
  client: { id: number; firstName: string; lastName: string; phone: string } | null;
  vehicule: { id: number; immatriculation: string; marque: string; modele: string } | null;
  agentEmetteur: { id: number; username: string; firstName: string; lastName: string } | null;
  agentValidateur?: { id: number; username: string; firstName: string; lastName: string };
  lignesBonDeSortiePieces: LigneBonDeSortie[] | null;
}

export interface BonDeSortieRequest {
  clientId: number;
  vehiculeId: number;
  ordreReparationId?: number;
  lignesPieces: { 
    pieceId?: number | null; 
    quantite: number; 
    prix?: number | null;
    isCustom?: boolean;
    designationPds?: string;
  }[];
  remarque?: string;
}
