import { StatutOrdre } from '../ordre-reparation.model';

export interface BaseStepResponseDto {
  id: number;
  numero: string;
  statut: StatutOrdre;
  vehiculeId?: number;
  hasOrdreTravail?: boolean;
  createdAt?: string;
  dateCreation?: string;
}
