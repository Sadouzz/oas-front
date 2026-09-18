import type { DiagnosticModel } from '../../diagnostics/models/diagnostic.model';

export enum StatutOrdreReparation {
  RECEPTION = 'RECEPTION',
  A_FAIRE = 'A_FAIRE',
  DIAGNOSTIC = 'DIAGNOSTIC',
  PIECES_MO = 'PIECES_MO',
  PROFORMA = 'PROFORMA',
  BON_DE_COMMANDE = 'BON_DE_COMMANDE',
  BON_DE_SORTIE = 'BON_DE_SORTIE',
  ASSIGN_TECHNICIEN = 'ASSIGN_TECHNICIEN',
  REPARATION = 'REPARATION',
  PAIEMENT = 'PAIEMENT',
  PRET_A_LIVRER = 'PRET_A_LIVRER',
  LIVRE = 'LIVRE'
}

export type StatutOrdre =
  | 'RECEPTION'
  | 'A_FAIRE'
  | 'DIAGNOSTIC'
  | 'EN_DIAGNOSTIC'
  | 'PIECES_MO'
  | 'EN_ATTENTE_PIECES_MO'
  | 'PROFORMA'
  | 'EN_ATTENTE_PROFORMA'
  | 'PROFORMA_VALIDE'
  | 'BON_DE_COMMANDE'
  | 'EN_ATTENTE_COMMANDE'
  | 'BON_DE_SORTIE'
  | 'EN_ATTENTE_SORTIE'
  | 'ASSIGN_TECHNICIEN'
  | 'EN_ATTENTE_MECANICIEN'
  | 'REPARATION'
  | 'EN_COURS'
  | 'PAIEMENT'
  | 'EN_ATTENTE_PAIEMENT'
  | 'PRET_A_LIVRER'
  | 'TERMINE'
  | 'LIVRE';

export const STATUT_ETAPES: Record<string, number> = {
  RECEPTION: 1,
  A_FAIRE: 1,
  DIAGNOSTIC: 2,
  EN_DIAGNOSTIC: 2,
  PIECES_MO: 3,
  EN_ATTENTE_PIECES_MO: 3,
  PROFORMA: 4,
  EN_ATTENTE_PROFORMA: 4,
  PROFORMA_VALIDE: 5,
  BON_DE_COMMANDE: 5,
  EN_ATTENTE_COMMANDE: 5,
  BON_DE_SORTIE: 6,
  EN_ATTENTE_SORTIE: 6,
  ASSIGN_TECHNICIEN: 7,
  EN_ATTENTE_MECANICIEN: 7,
  REPARATION: 8,
  EN_COURS: 8,
  PAIEMENT: 9,
  EN_ATTENTE_PAIEMENT: 9,
  PRET_A_LIVRER: 10,
  TERMINE: 10,
  LIVRE: 11
};

export const ETAPES_ORDRE_REPARATION: { etape: number; statut: StatutOrdre; label: string; path: string }[] = [
  { etape: 1,  statut: 'RECEPTION',         label: 'Réception',     path: 'reception' },
  { etape: 2,  statut: 'DIAGNOSTIC',        label: 'Diagnostic',    path: 'diagnostic' },
  { etape: 3,  statut: 'PIECES_MO',         label: 'Pièces & MO',   path: 'pieces-mo' },
  { etape: 4,  statut: 'PROFORMA',          label: 'Proforma',      path: 'proforma' },
  { etape: 5,  statut: 'BON_DE_COMMANDE',   label: 'Approv.',       path: 'approvisionnement' },
  { etape: 6,  statut: 'BON_DE_SORTIE',     label: 'Attente BS',    path: 'bon-sortie' },
  { etape: 7,  statut: 'ASSIGN_TECHNICIEN', label: 'Assign. Tech.', path: 'assignation' },
  { etape: 8,  statut: 'REPARATION',        label: 'Réparation',    path: 'reparation' },
  { etape: 9,  statut: 'PAIEMENT',          label: 'Paiement',      path: 'paiement' },
  { etape: 10, statut: 'PRET_A_LIVRER',     label: 'Prêt',          path: 'livraison' },
  { etape: 11, statut: 'LIVRE',             label: 'Livré',         path: 'cloture' }
];

export function getEtapeFromStatut(statut: string | StatutOrdreReparation | null | undefined): number {
  if (!statut) return 1;
  return STATUT_ETAPES[statut] || 1;
}


export interface LigneReceptionOrdre {
  nom: string;
  etat: boolean | null;
  /** true = ligne provenant de la fiche atelier d'origine : désignation non modifiable, non supprimable. */
  verrouille: boolean;
}

export interface LigneTravailOrdre {
  nom: string;
  /** true = ligne provenant de la désignation des travaux de la fiche atelier d'origine : non modifiable, non supprimable. */
  verrouille: boolean;
}

export interface OrdreReparation {
  id: number;
  numero: string;
  descriptionTravaux: string;
  lignesTravaux: LigneTravailOrdre[] | null;
  lignesReception: LigneReceptionOrdre[] | null;
  listeDefauts: string | null;
  dateCreation: string;
  updatedAt: string;
  dateSortie: string | null;
  statut: StatutOrdre;
  vehicule: {
    id: number;
    immatriculation: string;
    marque: string;
    modele: string;
    kilometrage?: number | null;
    client?: { id: number; firstName: string; lastName: string; phone?: string } | null;
  } | null;
  diagnostic?: DiagnosticModel | null;
  techniciens?: { id: number; firstName: string; lastName: string; specialite?: string | null }[];
  techniciensReparation?: { id: number; firstName: string; lastName: string; specialite?: string | null }[];
  bonDeSortie?: { id: number; reference: string; statut: string } | null;
  lignesOrdreReparationPieces?: {
    id: number;
    piece?: { id: number; reference?: string; designation?: string; prix?: number; type?: string; stockMagasin?: number; stockAtelier?: number };
    isCustom?: boolean;
    designationPds?: string;
    quantite: number;
    prix: number;
  }[];
  lignesOrdreReparationMainDoeuvres?: {
    id: number;
    mainDoeuvre?: { id: number; prix?: number; nbreHeure?: number; description?: string; categorie?: { nom: string } };
    nbreHeure: number;
    prix: number;
  }[];
}

export interface OrdreReparationRequest {
  numero: string;
  descriptionTravaux: string;
  lignesTravaux?: LigneTravailOrdre[];
  lignesReception?: LigneReceptionOrdre[];
  listeDefauts?: string;
  dateSortie?: string;
  vehiculeId: number;
  statut?: StatutOrdre;
  lignesPieces?: { 
    pieceId?: number | null; 
    quantite: number; 
    prix?: number | null;
    isCustom?: boolean;
    designationPds?: string;
  }[];
  lignesMainDoeuvres?: { mainDoeuvreId: number; nbreHeure: number; prix?: number | null }[];
}
