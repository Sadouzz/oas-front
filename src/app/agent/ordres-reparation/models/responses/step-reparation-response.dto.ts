import { BaseStepResponseDto } from './base-response.dto';
import { Technicien } from '../../../../shared/models';

export interface StepReparationResponseDto extends BaseStepResponseDto {
  rapportReparation?: string;
  techniciensReparation?: Technicien[];
  dateFinReparation?: string;
}
