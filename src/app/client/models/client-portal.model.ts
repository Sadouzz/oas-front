export interface ClientStats {
  devisEnAttente: number;
  proformasEnAttente: number;
  rdvAVenir: number;
  montantDu: number;
}

export interface ClientDashboardVehicule {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  annee?: number | null;
  kilometrage?: number | null;
  numeroChassis?: string | null;
  createdAt: string;
  stage: string;
  stageIndex: number;
  stageLabel: string;
  stageTone: string;
  ordreReparationNumero?: string;
  ordreReparationId?: number;
}

export interface ClientDashboard {
  stats: ClientStats;
  vehicules: ClientDashboardVehicule[];
}

export interface LigneReceptionItem {
  nom: string;
  etat: boolean | null;
}

export interface LignePieceSummary {
  id: number;
  quantite: number;
  prix: number;
  piece?: { reference: string };
}

export interface LigneMOSummary {
  id: number;
  nbreHeure: number;
  prix: number;
  mainDoeuvre?: { description: string };
}

export interface FicheEnCoursSummary {
  id: number;
  numero: string;
  statut: string;
  stageLabel: string;
  stageTone: string;
  dateCreation: string;
  updatedAt?: string;
  dateSortie?: string;
  listeDefauts?: string;
  descriptionTravaux?: string;
  lignesReception: LigneReceptionItem[];
  lignesOrdreReparationPieces: LignePieceSummary[];
  lignesOrdreReparationMainDoeuvres: LigneMOSummary[];
}

export interface ClientInterventionSummary {
  id: number;
  numero: string;
  statut: string;
  stageLabel: string;
  stageTone: string;
  dateCreation: string;
  dateSortie?: string;
  listeDefauts?: string;
  descriptionTravaux?: string;
  lignesReception: LigneReceptionItem[];
}

export interface ClientVehiculeCard {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  annee?: number | null;
  kilometrage?: number | null;
  numeroChassis?: string | null;
  createdAt: string;
  stage: string;
  stageIndex: number;
  stageLabel: string;
  stageTone: string;
  hasActiveRepair: boolean;
  ficheEnCours: FicheEnCoursSummary | null;
  historique: ClientInterventionSummary[];
}

export interface ClientInterventionItem {
  id: number;
  numero: string;
  statut: string;
  stageLabel: string;
  stageTone: string;
  dateCreation: string;
  dateSortie?: string;
  listeDefauts?: string;
  descriptionTravaux?: string;
  lignesReception: LigneReceptionItem[];
  vehicule?: {
    id: number;
    immatriculation: string;
    marque: string;
    modele: string;
  };
}

export interface ClientBookingContextVehicule {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  annee?: number | null;
  kilometrage?: number | null;
  numeroChassis?: string | null;
  disponiblePourRdv: boolean;
}

export interface ClientBookingContextGarage {
  id: number;
  nom: string;
  localite: string;
  prefixe: string;
  numeroFixe?: string;
  numeroWhatsapp?: string;
  email?: string;
}

export interface ClientBookingContext {
  vehicules: ClientBookingContextVehicule[];
  garages: ClientBookingContextGarage[];
}
