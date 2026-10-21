import { BaseStepResponseDto } from './base-response.dto';

export interface StepOrdreTravailResponseDto extends BaseStepResponseDto {
  etape?: number;
  ordreTravailId?: number;
  ordreTravailNumero?: string;
  ordreTravailStatut?: string;
  ordreTravailEtape?: number;
  ordreTravail?: {
    id: number;
    numero: string;
    statut: string;
    dateDebutReparation?: string;
    dateFinReparation?: string;
    rapportReparation?: string;
    techniciensReparation?: any[];
  };
  proforma?: {
    id: number;
    numero: string;
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
  };
  vehicule?: any;
  client?: any;
}
