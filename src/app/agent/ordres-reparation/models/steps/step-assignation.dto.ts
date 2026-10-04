import { BaseStepDto } from './base-step.dto';

export interface StepAssignationDto extends BaseStepDto {
  techniciensIds: number[];
  dateDebutPrevue?: string;
  tempsEstimeHeures?: number;
}
