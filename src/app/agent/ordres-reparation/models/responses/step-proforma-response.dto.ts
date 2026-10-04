import { BaseStepResponseDto } from './base-response.dto';

export interface StepProformaResponseDto extends BaseStepResponseDto {
  proforma?: {
    id: number;
    statut: string;
    montantHT?: number;
    montantTVA?: number;
    montantTTC?: number;
    numero?: string;
    dateCreation?: string;
    lignesPieces?: {
      id?: number;
      nom?: string;
      quantite?: number;
      prix?: number;
      montantTotal?: number;
      isCustom?: boolean;
    }[];
    lignesMainDoeuvres?: {
      id?: number;
      nom?: string;
      nbreHeure?: number;
      tarifHoraire?: number;
      montantTotal?: number;
    }[];
  };
  vehicule?: {
    immatriculation?: string;
    marque?: string;
    modele?: string;
    kilometrage?: number;
    client?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    }
  };
  diagnostic?: {
    kilometrage?: number;
  };
  updatedAt?: string;
  dateCreation?: string;
}
