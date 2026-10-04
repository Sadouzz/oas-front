import { LigneReceptionOrdre, LigneTravailOrdre } from '../ordre-reparation.model';
import { BaseStepDto } from './base-step.dto';

export interface StepReceptionDto extends BaseStepDto {
  lignesTravaux?: LigneTravailOrdre[];
  lignesReception?: LigneReceptionOrdre[];
}
