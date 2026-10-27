import { BaseStepResponseDto } from './base-response.dto';
import { Technicien, RemarqueDiagnostic, PieceJointeDiagnostic, StatutDiagnostic } from '../../../../shared/models';

export interface StepDiagnosticResponseDto extends BaseStepResponseDto {
  listeDefauts?: string;
  techniciensAssocies?: (Technicien | any)[];
  
  // Infos propres au diagnostic qui viennent du backend (soit de l'OR soit de l'entité Diagnostic)
  diagnostic?: {
    id: number;
    statut: StatutDiagnostic;
    pannesDetectees?: string;
    observations?: string;
    recommandations?: string;
    kilometrage?: number;
    technicienId?: number;
    technicienNom?: string;
    dateDebut?: string;
    dateFin?: string;
    remarques?: RemarqueDiagnostic[];
    piecesJointes?: PieceJointeDiagnostic[];
  };
}
