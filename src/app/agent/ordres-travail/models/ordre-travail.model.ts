export enum StatutOrdreTravail {
  RECAPITULATIF = 'RECAPITULATIF',         // Étape 1 : Récapitulatif (Proforma, Client, Véhicule)
  BON_DE_COMMANDE = 'BON_DE_COMMANDE',     // Étape 2 : Approvisionnement
  BON_DE_SORTIE = 'BON_DE_SORTIE',         // Étape 3 : Attente Bon de Sortie magasin
  ASSIGN_TECHNICIEN = 'ASSIGN_TECHNICIEN', // Étape 4 : Affectation des techniciens
  REPARATION = 'REPARATION',               // Étape 5 : Réparation en cours / rapport
  PAIEMENT = 'PAIEMENT',                   // Étape 6 : Paiement / Facturation
  PRET_A_LIVRER = 'PRET_A_LIVRER',         // Étape 7 : Prêt à livrer / Préparation
  LIVRE = 'LIVRE'                          // Étape 8 : Véhicule livré au client
}

export const STATUT_OT_ETAPES: Record<string, number> = {
  RECAPITULATIF: 1,
  BON_DE_COMMANDE: 2,
  BON_DE_SORTIE: 3,
  ASSIGN_TECHNICIEN: 4,
  REPARATION: 5,
  PAIEMENT: 6,
  PRET_A_LIVRER: 7,
  LIVRE: 8
};

export interface EtapeOrdreTravailConfig {
  etape: number;
  statut: StatutOrdreTravail;
  label: string;
  path: string;
  description: string;
}

export const ETAPES_ORDRE_TRAVAIL: EtapeOrdreTravailConfig[] = [
  { etape: 1, statut: StatutOrdreTravail.RECAPITULATIF,     label: 'Récapitulatif', path: 'recapitulatif',     description: 'Proforma, client et véhicule chiffrés' },
  { etape: 2, statut: StatutOrdreTravail.BON_DE_COMMANDE,   label: 'Approv.',       path: 'approvisionnement', description: 'Commandes fournisseurs' },
  { etape: 3, statut: StatutOrdreTravail.BON_DE_SORTIE,     label: 'Attente BS',    path: 'bon-sortie',        description: 'Sortie pièces du magasin' },
  { etape: 4, statut: StatutOrdreTravail.ASSIGN_TECHNICIEN, label: 'Assignation',   path: 'assignation',       description: 'Affectation des techniciens' },
  { etape: 5, statut: StatutOrdreTravail.REPARATION,        label: 'Réparation',    path: 'reparation',        description: 'Exécution technique et rapport' },
  { etape: 6, statut: StatutOrdreTravail.PAIEMENT,          label: 'Paiement',      path: 'paiement',          description: 'Facturation et règlement' },
  { etape: 7, statut: StatutOrdreTravail.PRET_A_LIVRER,     label: 'Prêt',          path: 'pret-a-livrer',     description: 'Préparation et contrôle qualité' },
  { etape: 8, statut: StatutOrdreTravail.LIVRE,             label: 'Livré',         path: 'livraison',         description: 'Clôture et remise au client' }
];

export function getEtapeFromStatutOT(statut: string | StatutOrdreTravail | null | undefined): number {
  if (!statut) return 1;
  return STATUT_OT_ETAPES[statut] || 1;
}

export function getPathFromEtapeOT(etape: number): string {
  const cfg = ETAPES_ORDRE_TRAVAIL.find(e => e.etape === etape);
  return cfg ? cfg.path : 'recapitulatif';
}

export function getStatutColorOT(statut: StatutOrdreTravail | string | undefined): { bg: string; text: string; border: string } {
  switch (statut) {
    case StatutOrdreTravail.RECAPITULATIF:
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
    case StatutOrdreTravail.BON_DE_COMMANDE:
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case StatutOrdreTravail.BON_DE_SORTIE:
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    case StatutOrdreTravail.ASSIGN_TECHNICIEN:
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
    case StatutOrdreTravail.REPARATION:
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
    case StatutOrdreTravail.PAIEMENT:
      return { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' };
    case StatutOrdreTravail.PRET_A_LIVRER:
      return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' };
    case StatutOrdreTravail.LIVRE:
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
  }
}

// ─── DTOs des Étapes ──────────────────────────────────────────────

export interface StepBaseDto {
  id: number;
  numero: string;
  statut: StatutOrdreTravail;
  etape: number;
  vehiculeId?: number;
  proformaId?: number;
  ordreReparationId?: number;
  ordreReparationNumero?: string;
}

// Étape 1 : Récapitulatif
export interface StepRecapitulatifResponseDto extends StepBaseDto {
  vehicule?: {
    id: number;
    immatriculation: string;
    marque: string;
    modele: string;
    kilometrage?: number;
  };
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  proforma?: {
    id: number;
    numero: string;
    statut: string;
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
    lignesPieces?: {
      id: number;
      nom: string;
      quantite: number;
      prix: number;
      montantTotal: number;
      isCustom?: boolean;
      type?: string;
    }[];
    lignesMainDoeuvre?: {
      id: number;
      designation: string;
      nbreHeure: number;
      tarifHoraire: number;
      montantTotal: number;
    }[];
  };
}

// Étape 2 : Approvisionnement
export interface PieceApprovisionnementDto {
  ligneId: number;
  pieceId?: number;
  reference?: string;
  designation: string;
  type?: string;
  isCustom?: boolean;
  quantiteDemandee: number;
  stockMagasin: number;
  stockAtelier?: number;
  quantiteManquante: number;
  differenceStock?: number;
  isManquant?: boolean;
  prixUnitaire?: number;
  montantTotal?: number;
  quantiteCommande?: number;
  quantiteRecue?: number;
}

export interface BonDeCommandePieceSummary {
  ligneId: number;
  pieceId?: number;
  reference?: string;
  designation?: string;
  quantite: number;
  quantiteRecue?: number;
  prixUnitaire?: number;
  montantTotal?: number;
}

export interface BonDeCommandeSummary {
  id: number;
  numero: string;
  reference?: string;
  fournisseurNom?: string;
  montantTotal: number;
  statut?: string;
  dateCommande?: string;
  nombrePieces?: number;
  pieces?: BonDeCommandePieceSummary[];
}

export interface StepApprovisionnementResponseDto extends StepBaseDto {
  hasBonDeCommande: boolean;
  proformaNumero?: string;
  bonsDeCommande?: BonDeCommandeSummary[];
  piecesManquantesProforma?: PieceApprovisionnementDto[];
  piecesProforma?: PieceApprovisionnementDto[];
}

// Étape 3 : Bon de Sortie
export interface PieceBonSortieDto {
  ligneId?: number;
  pieceId?: number;
  reference?: string;
  designation: string;
  quantiteDemandee: number;
  stockMagasin: number;
  stockAtelier?: number;
  quantiteASortir: number;
  quantiteSortie?: number;
  prixUnitaire?: number;
}

export interface StepBonSortieResponseDto extends StepBaseDto {
  vehiculeId?: number;
  proformaId?: number;
  ordreReparationId?: number;
  clientId?: number;
  hasBonDeSortie: boolean;
  proformaNumero?: string;
  piecesManquantesProforma?: PieceBonSortieDto[];
  bonDeSortie?: {
    id: number;
    numero?: string;
    reference?: string;
    statut: string;
    dateSortiePrevue?: string;
    dateSortieEffective?: string;
    remarques?: string;
    remarque?: string;
    lignesBonDeSortiePieces?: any[];
  } | null;
}

// Étape 4 : Assignation Techniciens
export interface TechnicienSummary {
  id: number;
  nom?: string;
  prenom?: string;
  firstName?: string;
  lastName?: string;
  specialite?: string;
  telephone?: string;
  email?: string;
}

export interface StepAssignationResponseDto extends StepBaseDto {
  techniciens?: TechnicienSummary[];
  dateDebutPrevue?: string;
  tempsEstimeHeures?: number;
}

export interface StepAssignationDto {
  techniciensIds: number[];
  statut?: StatutOrdreTravail;
  dateDebutPrevue?: string;
  tempsEstimeHeures?: number;
}

// Étape 5 : Réparation
export interface StepReparationResponseDto extends StepBaseDto {
  rapportReparation?: string;
  dateFinReparation?: string;
  techniciensReparation?: TechnicienSummary[];
}

export interface StepReparationDto {
  rapportReparation: string;
  dateFinReparation: string;
  statut?: StatutOrdreTravail;
}

// Étape 6 : Paiement
export interface FactureSummaryDto {
  id: number;
  numero?: string;
  client?: string;
  vehicule?: string;
  statut: string;
  montantAPayer?: number;
  montantPaye?: number;
  montantRestant: number;
  montantTotal?: number;
  modePaiement?: string;
}

export interface StepPaiementResponseDto extends StepBaseDto {
  vehiculeId?: number;
  proformaId?: number;
  ordreReparationId?: number;
  hasFacture: boolean;
  facture?: FactureSummaryDto | null;
}

// Étape 7 : Prêt à Livrer
export interface StepPretALivrerResponseDto extends StepBaseDto {
  remarquesPreparation?: string;
}

export interface StepPretALivrerDto {
  remarquesPreparation: string;
  statut?: StatutOrdreTravail;
}

// Étape 8 : Livraison
export interface StepLivraisonResponseDto extends StepBaseDto {
  dateSortie?: string;
  kilometrageSortie?: number;
  remarquesClient?: string;
}

export interface StepLivraisonDto {
  dateSortie: string;
  kilometrageSortie: number;
  remarquesClient?: string;
  statut?: StatutOrdreTravail;
}

// ─── Modèle Principal OrdreTravail ────────────────────────────────

export interface OrdreTravailSummaryDto {
  id: number;
  numero: string;
  statut: StatutOrdreTravail;
  statutLabel?: string;
  etape: number;
  ordreReparationId?: number;
  ordreReparationNumero?: string;
  proformaId?: number;
  proformaNumero?: string;
  vehicule?: {
    id: number;
    immatriculation: string;
    marque: string;
    modele: string;
    kilometrage?: number | null;
    client?: {
      id: number;
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
    };
  };
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  nombreTechniciens?: number;
  nombreBonsCommande?: number;
  nombreBonsSortie?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrdreTravail extends OrdreTravailSummaryDto {
  descriptionTravaux?: string;
  remarquesClient?: string;
  dateDebutPrevue?: string;
  dateFinReparation?: string;
  dateSortie?: string;
  kilometrageSortie?: number;
  tempsEstimeHeures?: number;
  rapportReparation?: string;
  remarquesPreparation?: string;
  signature?: string;
  // Tolérance rétrocompatible si d'autres endpoints retournent des champs plats
  clientNom?: string;
  vehiculeImmatriculation?: string;
  vehiculeMarqueModele?: string;
  vehiculeId?: number;
  techniciens?: TechnicienSummary[];
  proforma?: any;
}

export interface OrdreTravailRequest {
  numero?: string;
  descriptionTravaux?: string;
  vehiculeId?: number;
  proformaId?: number;
  ordreReparationId?: number;
  dateDebutPrevue?: string;
  tempsEstimeHeures?: number;
}
