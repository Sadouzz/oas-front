import { BaseStepResponseDto } from './base-response.dto';

export interface StepLivraisonResponseDto extends BaseStepResponseDto {
  dateSortie?: string;
  kilometrageSortie?: number;
  remarquesClient?: string;
}
