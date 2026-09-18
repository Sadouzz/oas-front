import { StatutOrdre } from '../../ordres-reparation/models/ordre-reparation.model';

export type TypePieceJointeDiagnostic = 'PHOTO' | 'PDF';

export type StatutDiagnostic = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINE' | 'VALIDE' | 'ANNULE';

export interface PieceJointeDiagnostic {
  id: number;
  diagnosticId?: number;
  ordreReparationId?: number;
  url: string;
  type: TypePieceJointeDiagnostic;
  remarque: string | null;
  technicienNom: string | null;
  createdAt: string;
}

export interface RemarqueDiagnostic {
  id: number;
  diagnosticId?: number;
  ordreReparationId?: number;
  technicienNom: string | null;
  technicien?: { id: number; firstName: string; lastName: string; specialite?: string | null } | null;
  contenu: string;
  createdAt: string;
}

export interface DiagnosticModel {
  id?: number;
  technicien?: { id: number; firstName: string; lastName: string; specialite?: string | null } | null;
  observations?: string | null;
  pannesDetectees?: string | null;
  recommandations?: string | null;
  kilometrage?: number | null;
  statut?: StatutDiagnostic;
  dateDebut?: string | null;
  dateFin?: string | null;
  piecesJointes?: PieceJointeDiagnostic[];
  remarques?: RemarqueDiagnostic[];
}

export interface DiagnosticRequest {
  ordreReparationId: number;
  technicienId?: number | null;
  technicienIds?: number[];
  observations?: string | null;
  pannesDetectees?: string | null;
  recommandations?: string | null;
  kilometrage?: number | null;
  statut?: StatutDiagnostic;
}

export interface DiagnosticStepDto {
  ordreReparationId: number;
  listeDefauts?: string;
  technicienId?: number | null;
  technicienIds?: number[];
  statut?: StatutDiagnostic;
  observations?: string | null;
  recommandations?: string | null;
  kilometrage?: number | null;
  piecesJointes?: { url: string; type: TypePieceJointeDiagnostic; remarque?: string | null }[];
  remarques?: { contenu: string; technicienId?: number | null }[];
}

export interface DiagnosticResponse {
  id: number;
  ordreReparationId?: number;
  ordreReparationNumero?: string;
  technicienId?: number | null;
  technicienNom?: string | null;
  technicienIds?: number[];
  ordreReparation?: {
    id: number;
    numero: string;
    descriptionTravaux?: string;
    statut?: StatutOrdre;
    vehicule?: {
      id: number;
      immatriculation: string;
      marque: string;
      modele: string;
      kilometrage?: number | null;
      client?: { id: number; firstName: string; lastName: string; phone?: string } | null;
    };
  };
  technicien?: { id: number; firstName: string; lastName: string; specialite?: string | null } | null;
  techniciens?: { id: number; firstName: string; lastName: string; specialite?: string | null }[];
  observations?: string | null;
  pannesDetectees?: string | null;
  recommandations?: string | null;
  kilometrage?: number | null;
  statut: StatutDiagnostic;
  dateDebut?: string | null;
  dateFin?: string | null;
  piecesJointes?: PieceJointeDiagnostic[];
  remarques?: RemarqueDiagnostic[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DiagnosticListResponse {
  id: number;
  ordreReparationId: number;
  ordreReparationNumero: string;
  vehicule?: {
    id: number;
    immatriculation: string;
    marque: string;
    modele: string;
    client?: {
      id: number;
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
    };
  };
  technicienId?: number;
  technicienNom?: string;
  techniciens?: {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
    specialite?: string;
  }[];
  observations?: string;
  pannesDetectees?: string;
  recommandations?: string;
  kilometrage?: number;
  statut: StatutDiagnostic;
  dateDebut?: string;
  dateFin?: string;
  createdAt?: string;
  updatedAt?: string;
}
