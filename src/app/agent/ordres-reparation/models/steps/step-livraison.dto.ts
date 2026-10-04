import { BaseStepDto } from './base-step.dto';

export interface StepLivraisonDto extends BaseStepDto {
  dateSortie: string;
  kilometrageSortie?: number;
  remarquesClient?: string;
}
