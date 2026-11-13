export type RendezVousStatus = 'EN_ATTENTE' | 'CONFIRME' | 'REFUSE' | 'ANNULE' | 'TERMINE';

export interface RendezVousDateHistory {
  id: number;
  ancienneDate: string;
  nouvelleDate: string;
  dateModification: string;
}

export interface RendezVousListResponse {
  id: number;
  clientId?: number;
  clientPhone?: string | null;
  numero?: string;
  dateRendezVous: string;
  clientName: string;
  vehiculeId?: number | null;
  vehiculeImmatriculation: string | null;
  vehiculeActif: boolean;
  motif: string;
  motifAnnulation?: string | null;
  statut: RendezVousStatus;
  hasFicheAtelier?: boolean;
}

export interface RendezVous {
  id: number;
  numero?: string;
  clientId: number;
  clientPhone?: string | null;
  clientName: string;
  vehiculeId: number | null;
  vehiculeImmatriculation: string | null;
  vehiculeActif: boolean;
  dateRendezVous: string;
  motif: string;
  motifAnnulation?: string | null;
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

export interface CreateRendezVousRequest {
  clientId: number;
  vehiculeId?: number | null;
  dateRendezVous: string;
  motif: string;
  statut?: RendezVousStatus;
  commentaire?: string | null;
  garageId?: number | null;
}

export interface QuotaDerogationRequest {
  id: number;
  clientId: number;
  clientNom: string;
  clientTelephone: string;
  vehiculeId: number;
  vehiculeImmatriculation: string;
  garageId: number | null;
  garageNom: string | null;
  dateRendezVous: string;
  motif: string | null;
  commentaire: string | null;
  statut: 'EN_ATTENTE' | 'APPROUVEE' | 'REFUSEE';
  statutRendezVousDemande: RendezVousStatus;
  origine: string;
  demandeur: string;
  plafondSnapshot: number | null;
  montantConsommeSnapshot: number | null;
  echeanceJoursSnapshot: number | null;
  dateDemande: string;
  decisionnaire: string | null;
  dateDecision: string | null;
  motifDecision: string | null;
  rendezVousId: number | null;
  rendezVousNumero: string | null;
}

export interface RendezVousCreationResult {
  type: 'RENDEZ_VOUS_CREE' | 'DEROGATION_EN_ATTENTE';
  rendezVous: RendezVous | null;
  demandeDerogation: QuotaDerogationRequest | null;
  message: string;
}
