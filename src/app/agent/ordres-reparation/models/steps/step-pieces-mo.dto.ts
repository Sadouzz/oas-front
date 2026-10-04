import { BaseStepDto } from './base-step.dto';

export interface LignePieceDto {
  pieceId?: number | null; 
  quantite: number; 
  prix?: number | null;
  isCustom?: boolean;
  designationPds?: string;
}

export interface LigneMoDto {
  mainDoeuvreId: number; 
  nbreHeure: number; 
  prix?: number | null;
}

export interface StepPiecesMoDto extends BaseStepDto {
  lignesPieces: LignePieceDto[];
  lignesMainDoeuvres: LigneMoDto[];
}
