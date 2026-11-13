export type PieceLigneType = 'PDP' | 'PDG' | 'PDS';

export interface EnrichableLignePiece {
  id?: number;
  pieceId?: number | null;
  designationPiece?: string | null;
  designationPds?: string | null;
  designation?: string | null;
  nom?: string | null;
  type?: string | null;
  typePiece?: string | null;
  isCustom?: boolean | null;
  custom?: boolean | null;
  referencePiece?: string | null;
  quantite?: number;
  prix?: number;
  montantTotal?: number;
  tauxRemise?: number;
  dateHeureSaisie?: string | null;
  piece?: {
    id?: number;
    designation?: string | null;
    reference?: string | null;
    type?: string | null;
  } | null;
}

const GENERIC_PIECE_LABELS = new Set([
  'pièce',
  'piece',
  'pièce à saisir',
  'piece a saisir',
  'pièce détachée',
  'piece detachee',
]);

const BADGE_CLASSES: Record<PieceLigneType, string> = {
  PDP: 'bg-blue-100 text-blue-800 border-blue-300',
  PDG: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  PDS: 'bg-amber-100 text-amber-800 border-amber-300',
};

export function isGenericPieceDesignation(name?: string | null): boolean {
  const normalized = (name ?? '').trim().toLowerCase();
  return !normalized || GENERIC_PIECE_LABELS.has(normalized);
}

/** Retourne le libellé lisible d'une ligne pièce (catalogue ou PDS). */
export function resolvePieceDesignation(l: EnrichableLignePiece | null | undefined): string {
  if (!l) return 'Pièce';
  const raw = (l.designationPiece ?? '').trim();
  const pds = (l.designationPds ?? '').trim();
  const nested = (l.piece?.designation ?? l.designation ?? l.nom ?? '').trim();

  if (pds && isGenericPieceDesignation(raw)) {
    return pds;
  }
  if (!isGenericPieceDesignation(raw)) {
    return raw;
  }
  return pds || nested || raw || 'Pièce';
}

/** Retourne le type normalisé d'une ligne pièce (PDP, PDG ou PDS). */
export function resolvePieceType(l: EnrichableLignePiece | null | undefined): PieceLigneType {
  if (!l) return 'PDP';
  const raw = (l.type ?? l.typePiece ?? l.piece?.type ?? '').trim().toUpperCase();
  if (raw === 'PDP' || raw === 'PDG' || raw === 'PDS') {
    return raw;
  }
  if (l.isCustom || l.custom || l.pieceId == null) {
    return 'PDS';
  }
  return 'PDP';
}

export function pieceTypeBadgeClass(type: PieceLigneType): string {
  return BADGE_CLASSES[type] ?? BADGE_CLASSES.PDP;
}
