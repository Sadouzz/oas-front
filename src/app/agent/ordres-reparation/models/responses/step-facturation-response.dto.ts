import { BaseStepResponseDto } from './base-response.dto';
import { FactureModel } from '../../../factures/models/facture.model';
import { NoteDePrixModel } from '../../../notes-prix/models/note-de-prix.model';

export interface StepFacturationResponseDto extends BaseStepResponseDto {
  remarquesPreparation?: string;
  typeDocument?: 'FACTURE' | 'NOTE_DE_PRIX' | null;
  hasDocument?: boolean;
  facture?: FactureModel | null;
  noteDePrix?: NoteDePrixModel | null;
}
