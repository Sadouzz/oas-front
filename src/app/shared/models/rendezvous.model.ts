export type RendezVousStatus = 'EN_ATTENTE' | 'CONFIRME' | 'REFUSE' | 'ANNULE' | 'TERMINE';

export interface RendezVousDateHistory {
  id: number;
  ancienneDate: string;
  nouvelleDate: string;
  dateModification: string;
}

export interface RendezVous {
  id: number;
  clientId: number;
  clientName: string;
  vehiculeId: number | null;
  vehiculeImmatriculation: string | null;
  dateRendezVous: string;
  motif: string;
  statut: RendezVousStatus;
  commentaire: string | null;
  dateCreation: string;
  dateHistory?: RendezVousDateHistory[];
  photoUrl?: string | null;
}
