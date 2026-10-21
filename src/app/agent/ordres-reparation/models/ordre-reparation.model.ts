import type { DiagnosticModel } from '../../diagnostics/models/diagnostic.model';
import type { FicheAtelierDetailsResponse, LigneDefaut } from '../../fiches-atelier/models/fiche-atelier.model';

export enum StatutOrdreReparation {
  RECEPTION = 'RECEPTION',                 // Étape 1
  DIAGNOSTIC = 'DIAGNOSTIC',               // Étape 2
  PIECES_MO = 'PIECES_MO',                 // Étape 3
  PROFORMA = 'PROFORMA',                   // Étape 4
  ORDRE_DE_TRAVAIL = 'ORDRE_DE_TRAVAIL',   // Étape 5 (nouveau : suivi de l'OT)
  PAIEMENT = 'PAIEMENT',                   // Étape 6 (remis dans l'OR)
  PRET_A_LIVRER = 'PRET_A_LIVRER',         // Étape 7
  LIVRE = 'LIVRE'                          // Étape 8
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
  | 'ORDRE_DE_TRAVAIL'
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
  ORDRE_DE_TRAVAIL: 5,
  BON_DE_COMMANDE: 5,
  EN_ATTENTE_COMMANDE: 5,
  BON_DE_SORTIE: 5,
  EN_ATTENTE_SORTIE: 5,
  ASSIGN_TECHNICIEN: 5,
  EN_ATTENTE_MECANICIEN: 5,
  REPARATION: 5,
  EN_COURS: 5,
  PAIEMENT: 6,
  EN_ATTENTE_PAIEMENT: 6,
  PRET_A_LIVRER: 7,
  TERMINE: 7,
  LIVRE: 8
};

export const ETAPES_ORDRE_REPARATION: { etape: number; statut: StatutOrdre; label: string; path: string }[] = [
  { etape: 1,  statut: 'RECEPTION',         label: 'Réception',        path: 'reception' },
  { etape: 2,  statut: 'DIAGNOSTIC',        label: 'Diagnostic',       path: 'diagnostic' },
  { etape: 3,  statut: 'PIECES_MO',         label: 'Pièces & MO',      path: 'pieces-mo' },
  { etape: 4,  statut: 'PROFORMA',          label: 'Proforma',         path: 'proforma' },
  { etape: 5,  statut: 'ORDRE_DE_TRAVAIL',  label: 'Ordre de Travail', path: 'ordre-travail' },
  { etape: 6,  statut: 'PAIEMENT',          label: 'Paiement',         path: 'paiement' },
  { etape: 7,  statut: 'PRET_A_LIVRER',     label: 'Prêt',             path: 'pret-a-livrer' },
  { etape: 8,  statut: 'LIVRE',             label: 'Livré',            path: 'livraison' }
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
  lignesDefauts?: LigneDefaut[] | null;
  ficheAtelierId?: number | null;
  ficheAtelier?: FicheAtelierDetailsResponse | null;
  dateCreation: string;
  updatedAt: string;
  dateSortie: string | null;
  dateRestitution?: string | null;
  garantieMois?: number | null;
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
  bonsDeSortie?: { id: number; reference: string; statut: string }[];
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
  hasDiagnostic?: boolean;
  hasPiecesMo?: boolean;
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

// ==========================================
// DTOs par étape (Exportés depuis le dossier steps & responses)
// ==========================================
export * from './steps';
export * from './responses';
