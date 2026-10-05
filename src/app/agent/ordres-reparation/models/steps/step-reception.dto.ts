import { LigneReceptionOrdre, LigneTravailOrdre } from '../ordre-reparation.model';
import { LigneDefaut } from '../../../fiches-atelier/models/fiche-atelier.model';
import { BaseStepDto } from './base-step.dto';

export interface StepReceptionDto extends BaseStepDto {
  lignesTravaux?: LigneTravailOrdre[];
  lignesReception?: LigneReceptionOrdre[];
  listeDefauts?: string;
  lignesDefauts?: LigneDefaut[];
}

