import { BaseStepDto } from './base-step.dto';

export interface StepPaiementDto extends BaseStepDto {
  montantPaye?: number;
  methodePaiement?: string;
}
