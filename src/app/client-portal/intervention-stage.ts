import { BadgeTone } from './ui/status-badge/status-badge.component';

/**
 * Étapes simplifiées à destination du client, dérivées du statut technique
 * de la fiche atelier (StatutFiche côté back, ex. EN_ATTENTE_MECANICIEN,
 * EN_ATTENTE_SORTIE...) qui reste trop détaillé/interne pour être affiché tel quel.
 * Partagé entre le dashboard et la page Véhicules.
 */
export const STAGE_ORDER = ['Prise en charge', 'Diagnostic', 'Préparation', 'Réparation en cours', 'Terminée'] as const;

const STAGE_MAP: Record<string, { label: string; tone: BadgeTone }> = {
  A_FAIRE: { label: 'Prise en charge', tone: 'neutral' },
  EN_DIAGNOSTIC: { label: 'Diagnostic', tone: 'info' },
  EN_ATTENTE_PROFORMA: { label: 'Préparation', tone: 'pending' },
  PROFORMA_VALIDE: { label: 'Préparation', tone: 'pending' },
  EN_ATTENTE_COMMANDE: { label: 'Préparation', tone: 'pending' },
  EN_ATTENTE_SORTIE: { label: 'Préparation', tone: 'pending' },
  EN_ATTENTE_MECANICIEN: { label: 'Préparation', tone: 'pending' },
  EN_COURS: { label: 'Réparation en cours', tone: 'info' },
  EN_ATTENTE_PAIEMENT: { label: 'Terminée', tone: 'success' },
  TERMINE: { label: 'Terminée', tone: 'success' },
  LIVRE: { label: 'Terminée', tone: 'success' },
};

export const AUCUN_HISTORIQUE = { label: 'Aucun historique', tone: 'neutral' as BadgeTone };

export function interventionStage(statut: string | null | undefined): { label: string; tone: BadgeTone } {
  if (!statut) return AUCUN_HISTORIQUE;
  return STAGE_MAP[statut] ?? { label: statut, tone: 'neutral' };
}

export function isActiveRepair(statut: string | null | undefined): boolean {
  if (!statut) return false;
  const stage = STAGE_MAP[statut];
  return !!stage && stage.label !== 'Terminée';
}

/** Index (0-based) de l'étape simplifiée dans STAGE_ORDER, ou -1 si statut inconnu. */
export function interventionStageIndex(statut: string | null | undefined): number {
  if (!statut) return -1;
  const stage = STAGE_MAP[statut];
  if (!stage) return -1;
  return STAGE_ORDER.indexOf(stage.label as typeof STAGE_ORDER[number]);
}

/** Explication en langage client de ce que signifie chaque étape (remplace "AI Insights" par un texte factuel, non généré). */
const STAGE_EXPLANATIONS: Record<typeof STAGE_ORDER[number], string> = {
  'Prise en charge': "a été pris en charge par le garage et est enregistré pour la suite du processus de réparation.",
  'Diagnostic': "passe actuellement par le processus de diagnostic. Cette étape est nécessaire pour déterminer la panne du véhicule.",
  'Préparation': "est en attente de préparation : le garage rassemble les pièces et la main d'œuvre nécessaires avant de démarrer la réparation.",
  'Réparation en cours': "est actuellement en cours de réparation par nos techniciens.",
  'Terminée': "a terminé sa réparation. Vous pouvez récupérer votre véhicule auprès du garage.",
};

export function stageExplanation(stageLabel: string, marque: string, modele: string): string {
  const text = STAGE_EXPLANATIONS[stageLabel as typeof STAGE_ORDER[number]];
  return text ? `Votre ${marque} ${modele} ${text}` : '';
}
