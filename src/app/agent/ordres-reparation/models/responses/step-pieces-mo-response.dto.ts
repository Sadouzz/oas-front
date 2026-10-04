import { BaseStepResponseDto } from './base-response.dto';

export interface StepPiecesMoResponseDto extends BaseStepResponseDto {
  lignesOrdreReparationPieces?: any[];
  lignesOrdreReparationMainDoeuvres?: any[];
}
