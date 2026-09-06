export type RendezVousStatus = 'EN_ATTENTE' | 'CONFIRME' | 'REFUSE' | 'ANNULE' | 'TERMINE';

export interface RendezVousDateHistory {
  id: number;
  ancienneDate: string;
  nouvelleDate: string;
  dateModification: string;
}

export interface RendezVousListResponse {
  id: number;
  numero?: string;
  dateRendezVous: string;
  clientName: string;
  vehiculeImmatriculation: string | null;
  motif: string;
  statut: RendezVousStatus;
  hasFicheAtelier?: boolean;
}

export interface RendezVous {
  id: number;
  numero?: string;
  clientId: number;
  clientName: string;
  vehiculeId: number | null;
  vehiculeImmatriculation: string | null;
  dateRendezVous: string;
  motif: string;
  statut: RendezVousStatus;
  commentaire: string | null;
  dateCreation: string;
  hasFicheAtelier: boolean;
  dateHistory?: RendezVousDateHistory[];
}

export interface ClientRendezVousRequest {
  dateRendezVous: string;
  motif: string;
  vehiculeId: number | null;
}

