import { BaseStepDto } from './base-step.dto';

export interface LignePieceDto {
  id?: number;
  pieceId?: number | null; 
  quantite: number; 
  prix?: number | null;
  tauxRemise?: number;
  isCustom?: boolean;
  designationPds?: string;
  dateHeureSaisie?: string | null;
}

export interface LigneMoDto {
  id?: number;
  mainDoeuvreId: number; 
  nbreHeure: number; 
  prix?: number | null;
  tauxRemise?: number;
  dateHeureSaisie?: string | null;
}

export interface StepPiecesMoDto extends BaseStepDto {
  lignesPieces: LignePieceDto[];
  lignesMainDoeuvres: LigneMoDto[];
}
