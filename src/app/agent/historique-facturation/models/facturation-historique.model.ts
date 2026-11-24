export type TypeHistoriqueFacturation =
  | 'BL'
  | 'FACTURE'
  | 'AVOIR_TTC'
  | 'NOTE_PRIX'
  | 'AVOIR_HT';

export interface FacturationHistoriqueItemDto {
  id: number;
  type: TypeHistoriqueFacturation;
  typeLabel: string;
  numero: string;
  vehiculeId: number | null;
  immatriculation: string | null;
  vehiculeMarque: string | null;
  vehiculeModele: string | null;
  clientId: number | null;
  clientNumero: string | null;
  clientNom: string | null;
  clientTelephone: string | null;
  dateCreation: string;
  dateModification: string | null;
  montantHT: number | null;
  montantTVA: number | null;
  montantTimbre: number | null;
  montantTTC: number | null;
  montantTotal: number;
  montantPaye: number | null;
  resteAPayer: number | null;
  statut: string;
  ordreReparationId: number | null;
  ordreReparationNumero: string | null;
  remarque: string | null;
}

export interface FacturationHistoriqueResponseDto {
  dateDebut: string | null;
  dateFin: string | null;
  clientId: number | null;
  clientNumero: string | null;
  totalOperations: number;
  totalBonsLivraison: number;
  totalFactures: number;
  totalAvoirsTTC: number;
  totalNotesDePrix: number;
  totalAvoirsHT: number;
  montantTotalBonsLivraisonTTC: number;
  montantTotalFacturesTTC: number;
  montantTotalAvoirsTTC: number;
  montantTotalNotesDePrixHT: number;
  montantTotalAvoirsHT: number;
  page: number | null;
  size: number | null;
  totalElements: number;
  totalPages: number;
  evenements: FacturationHistoriqueItemDto[];
}

export interface FacturationHistoriqueQueryParams {
  type?: TypeHistoriqueFacturation | 'ALL';
  date?: string;
  dateDebut?: string;
  dateFin?: string;
  clientId?: number;
  clientNumero?: string;
  keyword?: string;
  page?: number;
  size?: number;
}
