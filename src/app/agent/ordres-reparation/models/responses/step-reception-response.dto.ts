import { BaseStepResponseDto } from './base-response.dto';
import { LigneReceptionOrdre, LigneTravailOrdre } from '../ordre-reparation.model';

export interface StepReceptionResponseDto extends BaseStepResponseDto {
  descriptionTravaux?: string;
  lignesTravaux?: LigneTravailOrdre[];
  lignesReception?: LigneReceptionOrdre[];
  // Optionnellement, les détails du véhicule si affichés
  vehicule?: {
    id: number;
    immatriculation?: string;
    marque?: string;
    modele?: string;
  };
}
