/** Reçu d'encaissement RC-… d'une facture (champ `recus` de GET /api/factures/{id}). */
export interface RecuModel {
  id: number;
  numero: string;
  factureId: number;
  numeroFacture?: string;
  clientNom?: string;
  numeroOrdreReparation?: string;
  montant: number;
  montantTimbre?: number;
  montantEncaisse?: number;
  remarque?: string | null;
  datePaiement: string;
  /** Vrai si le versement qui a créé ce reçu RC a été annulé. */
  annule?: boolean;
  dateAnnulation?: string | null;
}


/* ---------- Reçu client (un reçu par client, plusieurs versements) ---------- */

export interface RecuListItem {
  /** Identifiant technique, utilisé dans les routes de l'API et du front. */
  id: number;
  /** Numéro affiché : PREFIXE_GARAGE-RE-ANNEE-0001. */
  numeroRecu: string;
  clientId: number;
  /** Matricule du client (numéro client affiché). */
  numeroClient: string | null;
  nomClient: string | null;
  dateDebut: string;
  dateFin: string | null;
  montant: number;
  montantPaye: number;
  valide: boolean;
}

export type RecuDocumentType = 'FACTURE' | 'NOTE_DE_PRIX';

export interface RecuDocument {
  type: RecuDocumentType;
  id: number;
  numero: string;
  date: string;
  montantHT: number;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
}

export interface RecuImputation {
  type: RecuDocumentType;
  documentId: number;
  numeroDocument: string;
  /** N° du reçu d'encaissement RC-… (factures uniquement) */
  numeroRecuFacture: string | null;
  montant: number;
}

export interface RecuVersement {
  id: number;
  dateVersement: string;
  montant: number;
  modePaiement: string | null;
  remarque: string | null;
  imputations: RecuImputation[];
}

export interface RecuDetail {
  /** Identifiant technique, utilisé dans les routes de l'API et du front. */
  id: number;
  /** Numéro affiché : PREFIXE_GARAGE-RE-ANNEE-0001. */
  numeroRecu: string;
  clientId: number;
  /** Matricule du client (numéro client affiché). */
  numeroClient: string | null;
  nomClient: string | null;
  telephone: string | null;
  dateDebut: string;
  dateFin: string | null;
  enCours: boolean;
  valide: boolean;
  dateValidation: string | null;
  factures: RecuDocument[];
  notesDePrix: RecuDocument[];
  totalFactures: number;
  totalNotesDePrix: number;
  montant: number;
  montantPaye: number;
  resteAPayer: number;
  versements: RecuVersement[];
}

export interface VersementClientRequest {
  montant: number;
  modePaiement?: string;
  remarque?: string;
}

export interface RecuSearchParams {
  /** Numéro de reçu, recherche partielle (« 0012 » trouve OAS-RE-2026-0012). */
  numeroRecu?: string | null;
  /** Matricule du client, recherche partielle. */
  numeroClient?: string | null;
  page?: number;
  size?: number;
}

/** Modes acceptés par POST /api/recus/{id}/versements */
export const RECU_MODES_PAIEMENT: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ESPECE', label: 'Espèce' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'CARTE_BANCAIRE', label: 'Carte bancaire' },
  { value: 'SOLDE_PREPAYE', label: 'Solde prépayé' },
  { value: 'AUTRE', label: 'Autre' },
];

/** Vrai si le montant est > 0 et a au plus deux décimales. */
export function montantVersementValide(montant: number): boolean {
  return Number.isFinite(montant) && montant > 0 && Math.abs(Math.round(montant * 100) - montant * 100) < 1e-6;
}

/** Objet Page de Spring renvoyé par les listes de reçus. */
export interface RecuPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
