export type FactureModePaiement =
  | 'ESPECE_TTC' | 'CHEQUE_TTC' | 'ESPECE_HT' | 'CHEQUE_HT'
  | 'VIREMENT' | 'SOLDE_PREPAYE' | 'WAVE' | 'ORANGE_MONEY'
  | 'CARTE_BANCAIRE' | 'CARTE' | 'AUTRE';

/** Modes officiels de paiement pour Facture et Note de prix */
export const FACTURE_MODES_PAIEMENT: ReadonlyArray<{ value: FactureModePaiement; label: string }> = [
  { value: 'ESPECE_TTC', label: 'Espèce' },
  { value: 'CHEQUE_TTC', label: 'Chèque' },
  { value: 'ESPECE_HT', label: 'Espèce HT' },
  { value: 'CHEQUE_HT', label: 'Chèque HT' },
];

export const TOUS_MODES_PAIEMENT: ReadonlyArray<{ value: FactureModePaiement; label: string }> = [
  { value: 'ESPECE_TTC', label: 'Espèce' },
  { value: 'CHEQUE_TTC', label: 'Chèque' },
  { value: 'ESPECE_HT', label: 'Espèce HT' },
  { value: 'CHEQUE_HT', label: 'Chèque HT' },
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'SOLDE_PREPAYE', label: 'Solde prépayé' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'CARTE_BANCAIRE', label: 'Carte bancaire' },
  { value: 'AUTRE', label: 'Autre' },
];

export const MESSAGE_TIMBRE_ESPECES = 'Si le client veut payer en espèce, il doit ajouter le timbre de 1 %.';

export function modePaiementRecu(mode?: string | null): string {
  if (!mode) return 'ESPECE';
  if (mode === 'ESPECE_TTC' || mode === 'ESPECE_HT' || mode === 'ESPECE') return 'ESPECE';
  if (mode === 'CHEQUE_TTC' || mode === 'CHEQUE_HT' || mode === 'CHEQUE') return 'CHEQUE';
  return mode === 'CARTE' ? 'CARTE_BANCAIRE' : mode;
}

export function isModeHt(mode?: string | null): boolean {
  return mode === 'ESPECE_HT' || mode === 'CHEQUE_HT';
}

export function isModeEspeces(mode?: string | null): boolean {
  return mode === 'ESPECE' || mode === 'ESPECE_TTC' || mode === 'ESPECE_HT';
}

export function modePaiementLabel(mode?: string | null): string {
  if (!mode) return '—';
  const labels: Record<string, string> = {
    ESPECE_TTC: 'Espèce',
    CHEQUE_TTC: 'Chèque',
    ESPECE_HT: 'Espèce HT',
    CHEQUE_HT: 'Chèque HT',
    ESPECE: 'Espèce',
    CHEQUE: 'Chèque',
    VIREMENT: 'Virement bancaire',
    SOLDE_PREPAYE: 'Solde prépayé',
    WAVE: 'Wave',
    ORANGE_MONEY: 'Orange Money',
    CARTE_BANCAIRE: 'Carte bancaire',
    CARTE: 'Carte bancaire',
    AUTRE: 'Autre',
  };
  return labels[mode] || mode;
}
