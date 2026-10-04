import { StatutOrdre } from '../ordre-reparation.model';

export interface BaseStepDto {
  ordreId?: number;
  numero?: string;
  descriptionTravaux?: string;
  vehiculeId?: number;
  statut?: StatutOrdre;
}
