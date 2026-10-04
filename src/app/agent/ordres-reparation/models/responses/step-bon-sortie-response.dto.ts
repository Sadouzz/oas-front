import { BaseStepResponseDto } from './base-response.dto';

export interface StepBonSortieResponseDto extends BaseStepResponseDto {
  bonDeSortie?: {
    id: number;
    statut: string;
    dateSortiePrevue?: string;
  };
}
