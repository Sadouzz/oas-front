import { BaseStepDto } from './base-step.dto';

export interface StepDiagnosticDto extends BaseStepDto {
  listeDefauts?: string;
  technicienIds?: number[];
}
