export type FactureModePaiement =
  | 'ESPECE_TTC' | 'CHEQUE_TTC' | 'ESPECE_HT' | 'CHEQUE_HT'
  | 'VIREMENT' | 'SOLDE_PREPAYE' | 'WAVE' | 'ORANGE_MONEY'
  | 'CARTE_BANCAIRE' | 'CARTE' | 'AUTRE';

export const FACTURE_MODES_PAIEMENT: ReadonlyArray<{ value: FactureModePaiement; label: string }> = [
  { value: 'ESPECE_TTC', label: 'Espèces TTC' },
  { value: 'CHEQUE_TTC', label: 'Chèque TTC' },
  { value: 'ESPECE_HT', label: 'Espèces HT' },
  { value: 'CHEQUE_HT', label: 'Chèque HT' },
  { value: 'VIREMENT', label: 'Virement bancaire' },
  { value: 'SOLDE_PREPAYE', label: 'Solde prépayé' },
  { value: 'WAVE', label: 'Wave' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'CARTE_BANCAIRE', label: 'Carte bancaire' },
  { value: 'AUTRE', label: 'Autre' },
];

export function modePaiementRecu(mode?: string | null): string {
  if (!mode) return 'ESPECE';
  if (mode === 'ESPECE_TTC' || mode === 'ESPECE_HT') return 'ESPECE';
  if (mode === 'CHEQUE_TTC' || mode === 'CHEQUE_HT') return 'CHEQUE';
  return mode === 'CARTE' ? 'CARTE_BANCAIRE' : mode;
}
