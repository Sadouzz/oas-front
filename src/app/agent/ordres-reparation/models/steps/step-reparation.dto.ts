import { LignePieceDto } from './step-pieces-mo.dto';
import { BaseStepDto } from './base-step.dto';

export interface StepReparationDto extends BaseStepDto {
  rapportReparation?: string;
  piecesReellementUtilisees?: LignePieceDto[];
  dateFinReparation?: string;
}
