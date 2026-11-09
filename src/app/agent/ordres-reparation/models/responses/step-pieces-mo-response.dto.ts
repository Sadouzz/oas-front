import { BaseStepResponseDto } from './base-response.dto';

export interface StepPiecesMoResponseDto extends BaseStepResponseDto {
  tauxRemiseClient?: number;
  lignesOrdreReparationPieces?: Array<{ id?: number; pieceId?: number | null; designationPds?: string | null; quantite?: number; prix?: number | null; tauxRemise?: number; dateHeureSaisie?: string | null }>;
  lignesOrdreReparationMainDoeuvres?: Array<{ id?: number; mainDoeuvreId?: number; nbreHeure?: number; prix?: number | null; tauxRemise?: number; dateHeureSaisie?: string | null }>;
}
