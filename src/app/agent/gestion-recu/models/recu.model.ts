export interface RecuModel {
  id: number;
  numero: string;
  factureId: number;
  numeroFacture?: string;
  clientNom?: string;
  numeroOrdreReparation?: string;
  montant: number;
  modePaiement: string | null;
  remarque: string | null;
  datePaiement: string;
}

export interface RecuRequest {
  factureId: number;
  montant: number;
  modePaiement: string;
  remarque?: string;
}
