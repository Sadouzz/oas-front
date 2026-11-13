import { BaseStepResponseDto } from './base-response.dto';

export interface StepProformaResponseDto extends BaseStepResponseDto {
  ordreTravailId?: number;
  ordreTravailNumero?: string;
  proforma?: {
    id: number;
    statut: string;
    montantHT?: number;
    montantTVA?: number;
    tvaApplicable?: boolean | null;
    montantTTC?: number;
    montantTimbre?: number;
    timbreFiscalRate?: number | null;
    montantTotal?: number;
    tauxRemiseClient?: number;
    montantRemiseClient?: number;
    numero?: string;
    visibleClient?: boolean;
    dateCreation?: string;
    lignesPieces?: {
      id?: number;
      nom?: string;
      quantite?: number;
      prix?: number;
      montantTotal?: number;
      tauxRemise?: number;
      isCustom?: boolean;
      type?: string;
      dateHeureSaisie?: string | null;
    }[];
    lignesMainDoeuvres?: {
      id?: number;
      nom?: string;
      nbreHeure?: number;
      tarifHoraire?: number;
      montantTotal?: number;
      tauxRemise?: number;
      dateHeureSaisie?: string | null;
    }[];
  };
  vehicule?: {
    immatriculation?: string;
    marque?: string;
    modele?: string;
    kilometrage?: number;
    client?: {
      id?: number;
      firstName?: string;
      lastName?: string;
      phone?: string;
      email?: string;
    }
  };
  diagnostic?: {
    kilometrage?: number;
  };
  updatedAt?: string;
  dateCreation?: string;
}
