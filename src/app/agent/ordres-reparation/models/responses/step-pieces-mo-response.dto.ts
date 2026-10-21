import { BaseStepResponseDto } from './base-response.dto';

export interface StepPiecesMoResponseDto extends BaseStepResponseDto {
  tauxRemiseClient?: number;
  lignesOrdreReparationPieces?: any[];
  lignesOrdreReparationMainDoeuvres?: any[];
}
