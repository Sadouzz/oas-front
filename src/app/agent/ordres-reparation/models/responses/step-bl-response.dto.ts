import { BaseStepResponseDto } from './base-response.dto';

export interface LignePieceBLDto {
  id?: number;
  pieceId?: number;
  type?: string;
  referencePiece?: string;
  designationPiece?: string;
  designationPds?: string;
  isCustom?: boolean;
  quantite?: number;
  prix?: number;
  prixCatalogue?: number;
  montantTotal?: number;
  tauxRemise?: number;
  dateHeureSaisie?: string | null;
}

export interface LigneMainDoeuvreBLDto {
  id?: number;
  mainDoeuvreId?: number;
  descriptionMainDoeuvre?: string;
  nbreHeure?: number;
  tarifHoraire?: number;
  montantTotal?: number;
  tauxRemise?: number;
  dateHeureSaisie?: string | null;
}

export interface BonDeLivraisonSummaryDto {
  id?: number;
  numero?: string;
  dateCreation?: string;
  statut?: string;
  remarque?: string;
  montantHT?: number;
  montantTVA?: number;
  montantTTC?: number;
  tvaApplicable?: boolean;
  factureId?: number;
  factureNumero?: string;
  noteDePrixId?: number;
  noteDePrixNumero?: string;
}

export interface NoteDePrixSummaryDto {
  id: number;
  numero?: string;
  statut?: string;
  montantHT?: number;
  montantTVA?: number;
  montantTTC?: number;
  montantTotal?: number;
  client?: string;
  vehicule?: string;
  dateCreation?: string;
}

export interface StepBLResponseDto extends BaseStepResponseDto {
  etape?: number;
  clientId?: number;
  clientNom?: string;
  clientTelephone?: string;
  immatriculation?: string;
  marque?: string;
  modele?: string;
  hasBonDeLivraison?: boolean;
  bonDeLivraison?: BonDeLivraisonSummaryDto;
  montantHT?: number;
  montantTVA?: number;
  montantTTC?: number;
  montantTotal?: number;
  tvaApplicable?: boolean;
  tvaRate?: number;
  lignesPieces?: LignePieceBLDto[];
  lignesMainDoeuvres?: LigneMainDoeuvreBLDto[];
  facture?: {
    id: number;
    numero?: string;
    statut: string;
    montantAPayer?: number;
    montantPaye?: number;
    montantRestant?: number;
    montantTotal?: number;
    timbreFiscalRate?: number | null;
    montantTimbre?: number | null;
    tvaApplicable?: boolean | null;
    modePaiement?: string;
    client?: string;
    vehicule?: string;
  };
  hasNoteDePrix?: boolean;
  noteDePrix?: NoteDePrixSummaryDto;
}

