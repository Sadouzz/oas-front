export type StatutBonCommande = 'EN_ATTENTE' | 'ENVOYE' | 'INCOMPLET' | 'RECU' | 'ANNULE'; 

export interface LigneBonDeCommande {
    id?: number;
    pieceDetacheeId?: number | null;
    designationPiece?: string;
    reference?: string;
    categorie?: string;
    quantite: number;
    quantiteRecue?: number;
    prixUnitaire: number;
    montant: number;
    isCustom: boolean;
}

export interface BonDeCommande {
    id: number;
    numero: string;
    dateCommande: string;
    statut: StatutBonCommande;
    fournisseurId: number;
    fournisseurNom: string;
    vehiculeId: number | null;
    immatriculationVehicule: string | null;
    montantHT: number;
    montantTVA: number;
    montantTTC: number;
    tvaApplicable: boolean;
    paye: boolean;
    observation: string | null;
    lignes: LigneBonDeCommande[];
}

export interface LigneBonDeCommandeRequest {
    id?: number;
    pieceDetacheeId?: number;
    quantite: number;
    prixUnitaire: number;
    designationPds?: string;
    typePiece?: string;
}

export interface BonDeCommandeRequest {
    fournisseurId?: number | null;
    vehiculeId?: number | null;
    tvaApplicable: boolean;
    observation?: string;
    lignes: LigneBonDeCommandeRequest[];
}

export interface ReceptionBonDeCommandeLigne {
    ligneId: number;
    quantiteRecue: number;
}

export interface ReceptionBonDeCommandeRequest {
    lignes: ReceptionBonDeCommandeLigne[];
}