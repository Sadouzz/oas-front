import { BaseStepResponseDto } from './base-response.dto';

export interface PieceApprovisionnementDto {
  ligneId?: number;
  pieceId?: number | null;
  reference?: string;
  designation?: string;
  type?: 'PDP' | 'PDG' | 'PDS' | string;
  isCustom?: boolean;
  quantiteDemandee: number;
  stockMagasin: number;
  stockAtelier?: number;
  quantiteManquante: number;
  differenceStock?: number;
  isManquant: boolean;
  prixUnitaire?: number;
  montantTotal?: number;
  quantiteCommande?: number;
  quantiteRecue?: number;
}

export interface PieceBonCommandeDto {
  ligneId?: number;
  pieceId?: number | null;
  reference?: string;
  designation?: string;
  quantite: number;
  quantiteRecue?: number;
  prixUnitaire?: number;
  montantTotal?: number;
}

export interface BonCommandeSummaryDto {
  id: number;
  numero: string;
  reference?: string;
  fournisseurNom?: string;
  statut?: 'EN_ATTENTE' | 'ENVOYE' | 'INCOMPLET' | 'RECU' | 'ANNULE' | string;
  montantTotal?: number;
  dateCommande?: string;
  dateCreation?: string;
  nombrePieces?: number;
  pieces?: PieceBonCommandeDto[];
}

export interface StepApprovisionnementResponseDto extends BaseStepResponseDto {
  proformaId?: number | null;
  proformaNumero?: string | null;
  hasBonDeCommande?: boolean;
  piecesManquantesProforma?: PieceApprovisionnementDto[];
  piecesProforma?: PieceApprovisionnementDto[];
  bonsDeCommande?: BonCommandeSummaryDto[];
}

