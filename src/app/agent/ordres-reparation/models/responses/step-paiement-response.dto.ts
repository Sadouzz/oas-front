import { BaseStepResponseDto } from './base-response.dto';

export interface StepPaiementResponseDto extends BaseStepResponseDto {
  etape?: number;
  clientId?: number;
  facture?: {
    id: number;
    numero?: string;
    statut: string;
    montantAPayer?: number;
    montantPaye?: number;
    montantRestant?: number;
    montantTotal?: number;
    modePaiement?: string;
    client?: string;
    vehicule?: string;
  };
}
