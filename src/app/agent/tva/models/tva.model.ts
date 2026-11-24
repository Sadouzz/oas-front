import { PageResponse } from '../../../shared/models';

export interface TvaVenteItemDto {
  id: number;
  numero: string;
  date: string;
  montantTva: number;
  montantTimbre: number;
}

export interface FactureAcheteeRequest {
  numeroFacture: string;
  dateFacture: string;
  montantTva: number;
}

export interface FactureAcheteeResponse {
  id: number;
  numeroFacture: string;
  dateFacture: string;
  montantTva: number;
  agentId: number | null;
  agentNom: string | null;
  createdAt: string;
}

export interface AvoirTvaAcheteeRequest {
  designation: string;
  dateOperation: string;
  montantTva: number;
}

export interface AvoirTvaAcheteeResponse {
  id: number;
  designation: string;
  dateOperation: string;
  montantTva: number;
  agentId: number | null;
  agentNom: string | null;
  createdAt: string;
}

export interface TvaRapportUpdateRequest {
  month: string;
  montant: number;
  verrouilleManuellement?: boolean;
}

export interface TvaDeclarationResponseDto {
  month: string;
  previousMonth: string;
  facturesVendues: PageResponse<TvaVenteItemDto>;
  avoirsVendus: PageResponse<TvaVenteItemDto>;
  facturesAchetees: PageResponse<FactureAcheteeResponse>;
  avoirsTvaAchetees: PageResponse<AvoirTvaAcheteeResponse>;
  totalTvaVendue: number;
  totalTimbreVendu: number;
  totalTvaAvoirVendu: number;
  totalTimbreAvoirVendu: number;
  rapportTvaVendue: number;
  totalTimbre: number;
  totalTvaAchetee: number;
  totalAvoirTvaAchetee: number;
  rapportTvaAchetee: number;
  rapport: number;
  difference: number;
  solde: number;
}
