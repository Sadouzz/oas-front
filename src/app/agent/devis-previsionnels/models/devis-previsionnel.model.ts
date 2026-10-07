export interface DevisPrevisionnel {
  id: number;
  numero?: string;
  notesReparation?: string;
  montantTotal: number;
  kilometrageVehicule?: number;
  createdAt?: string;
  dateCreation?: string;
  statut: 'EN_ATTENTE' | 'ACCEPTE' | 'REJETE' | 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'ANNULEE' | string;
  ficheAtelierId?: number | null;
  clientId?: number | null;
  clientNom?: string | null;
  vehiculeId?: number | null;
  vehiculeImmatriculation?: string | null;
  vehicule?: { id: number; immatriculation: string; marque?: string; modele?: string } | null;
  client?: { id: number; firstName: string; lastName: string; phone?: string } | null;
  agent?: { id: number; firstName: string; lastName: string } | null;
}

export interface DevisPrevisionnelOnFicheAtelier {
  id: number;
  numero?: string;
  notesReparation?: string;
  montantTotal: number;
  kilometrageVehicule?: number;
  createdAt?: string;
  dateCreation?: string;
  statut: 'EN_ATTENTE' | 'ACCEPTE' | 'REJETE' | 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'ANNULEE' | string;
  ficheAtelierId?: number | null;
  clientId?: number | null;
  clientNom?: string | null;
  vehiculeId?: number | null;
  vehiculeImmatriculation?: string | null;
  vehicule?: { id: number; immatriculation: string; marque?: string; modele?: string } | null;
  client?: { id: number; firstName: string; lastName: string; phone?: string } | null;
  agent?: { id: number; firstName: string; lastName: string } | null;
}

export interface DevisPrevisionnelRequest {
  notesReparation: string;
  montantTotal: number;
  kilometrageVehicule: number;
  vehiculeId: number;
  clientId: number;
  ficheAtelierId?: number;
  ordreReparationId?: number;
}
