import { BaseStepResponseDto } from './base-response.dto';

export interface StepPaiementResponseDto extends BaseStepResponseDto {
  facture?: {
    id: number;
    statut: string;
    montantRestant?: number;
  };
}
