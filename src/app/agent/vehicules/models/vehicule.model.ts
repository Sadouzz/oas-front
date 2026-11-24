import { UserModel } from '../../../shared/models/user.model';

export interface VehiculeModel {
  id: number;
  immatriculation: string;
  annee: number | null;
  modele: string;
  marque: string;
  kilometrage: number | null;
  numeroChassis: string;
  client: UserModel | null;
  archiveParClient: boolean;
  actif: boolean;
  createdAt: string;
}

export interface VehiculeRequest {
  immatriculation: string;
  annee: number | null;
  modele: string;
  marque: string;
  kilometrage: number | null;
  numeroChassis: string;
  clientId: number | null;
}

export type TypeHistoriqueVehicule =
  | 'OR'
  | 'OT'
  | 'FACTURE'
  | 'NOTE_PRIX'
  | 'BS'
  | 'BL'
  | 'DEVIS'
  | 'RDV';

export interface VehiculeHistoriqueItemDto {
  id: number;
  type: TypeHistoriqueVehicule;
  typeLabel: string;
  numero: string;
  date: string | null;
  statut: string;
  description: string;
  meta: string | null;
  montant: number | null;
  montantPaye: number | null;
  resteAPayer: number | null;
  ordreReparationId: number | null;
  ordreReparationNumero: string | null;
  agentId: number | null;
  agentNom: string | null;
  kilometrage: number | null;
}

export interface VehiculeHistoriqueResponseDto {
  vehiculeId: number;
  immatriculation: string;
  marque: string;
  modele: string;
  annee: number | null;
  kilometrage: number | null;
  numeroChassis: string | null;
  actif: boolean;
  clientId: number | null;
  clientNom: string | null;
  clientTelephone: string | null;
  totalOperations: number;
  totalOrdresReparation: number;
  totalOrdresTravail?: number;
  totalFactures: number;
  totalNotesDePrix: number;
  totalBonsSortie: number;
  totalBonsLivraison: number;
  totalDevis: number;
  totalRendezVous: number;
  montantTotalFacture: number;
  montantTotalPaye: number;
  resteAPayer: number;
  page: number | null;
  size: number | null;
  totalElements: number;
  totalPages: number;
  evenements: VehiculeHistoriqueItemDto[];
}

export interface VehiculeHistoriqueQueryParams {
  type?: TypeHistoriqueVehicule | 'ALL';
  keyword?: string;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  size?: number;
}
