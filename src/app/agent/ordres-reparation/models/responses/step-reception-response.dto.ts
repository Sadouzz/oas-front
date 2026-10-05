import { BaseStepResponseDto } from './base-response.dto';
import { LigneReceptionOrdre, LigneTravailOrdre } from '../ordre-reparation.model';
import { FicheAtelierDetailsResponse, LigneDefaut } from '../../../fiches-atelier/models/fiche-atelier.model';

export interface StepReceptionResponseDto extends BaseStepResponseDto {
  descriptionTravaux?: string;
  lignesTravaux?: LigneTravailOrdre[];
  lignesReception?: LigneReceptionOrdre[];
  listeDefauts?: string;
  lignesDefauts?: LigneDefaut[];
  ficheAtelierId?: number;
  ficheAtelier?: FicheAtelierDetailsResponse;
  // Optionnellement, les détails du véhicule si affichés
  vehicule?: {
    id: number;
    immatriculation?: string;
    marque?: string;
    modele?: string;
    kilometrage?: number | null;
    client?: { id: number; firstName: string; lastName: string; phone?: string } | null;
  };
}

