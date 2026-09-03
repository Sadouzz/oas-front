export interface EtatOrdreReparationDTO {
  diagnostic: number;
  attenteProforma: number;
  proformaValide: number;
  attentePieces: number;
  attenteSortie: number;
  enReparation: number;
  attentePaiement: number;
  termine: number;
  totalActifs: number;
}

export interface OrdreReparationRecentDTO {
  id: number;
  numero: string;
  statut: string;
  immatriculation: string;
  date: string;
}

export interface ClientRecentDTO {
  id: number;
  nom: string;
  telephone: string;
}

export interface AlerteStockRecentDTO {
  id: number;
  designation: string;
  reference: string;
  stockMagasin: number;
  statut: string;
}

export interface BonDeSortieEnAttenteDTO {
  id: number;
  reference?: string;
  client?: string | null;
  immatriculation?: string | null;
  nombrePieces?: number | null;
  date?: string | null;
}

export interface DashboardSuperAgentResponseDTO {
  totalClients: number;
  totalVehicules: number;
  totalRupturesDeStock: number;
  totalBonsDeSortieEnAttente: number;
  etatOrdresReparation: EtatOrdreReparationDTO;
  ordresRecents: OrdreReparationRecentDTO[];
  clientsRecents: ClientRecentDTO[];
  alertesStock: AlerteStockRecentDTO[];
}

export interface DashboardChefAtelierResponse {
  totalBonsDeSortieEnAttente: number;
  totalVehicules: number;
  etatOrdresReparation: EtatOrdreReparationDTO;
  bonsDeSortieEnAttenteValidation: BonDeSortieEnAttenteDTO[];
}

export interface DashboardAgentResponse {
  totalClients: number;
  totalVehicules: number;
  totalBonsDeSortieEnAttente: number;
  etatOrdresReparation: EtatOrdreReparationDTO;
  clientsRecents: ClientRecentDTO[];
  bonsDeSortieEnAttente: BonDeSortieEnAttenteDTO[];
}

export interface DashboardAgentMagasinResponse {
  totalAlertes: number;
  totalRuptures: number;
  totalStocksFaibles: number;
  totalBonsEnAttente: number;
  rupturesDeStock: AlerteStockRecentDTO[];
  stocksFaibles: AlerteStockRecentDTO[];
}
