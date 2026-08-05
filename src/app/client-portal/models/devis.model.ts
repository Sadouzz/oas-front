export type StatutDevis = 'EN_ATTENTE' | 'ACCEPTE' | 'REJETE' | 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'ANNULEE';

export interface DevisPrevisionnel {
  id: number;
  notesReparation: string | null;
  montantTotal: number;
  dateCreation: string;
  kilometrageVehicule: number;
  statut: StatutDevis;
  vehicule: { id: number; immatriculation: string; marque: string; modele: string } | null;
}
