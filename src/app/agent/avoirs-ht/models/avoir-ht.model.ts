export interface AvoirHT {
    id: number;
    numero: string;
    dateCreation: string;
    montantHT: number;
    montantTotal: number;
    agentNom: string;
    remarque: string | null;
    kilometrage: number;
    clientId: number;
    clientNom: string;
    vehiculeId: number | null;
    immatriculation: string | null;
    marque: string | null;
    modele: string | null;
    annee: number | null;
    numeroBonDeCommande: string | null;
    lignesPieces: { id: number; designationPiece: string; quantite: number; prix: number; montantTotal: number }[];
    lignesMainDoeuvres: { id: number; descriptionMainDoeuvre: string; nbreHeure: number; tarifHoraire: number; montantTotal: number }[];
}

export interface AvoirHTCreateRequest {
    clientId: number;
    vehiculeId?: number | null;
    kilometrage?: number;
    remarque?: string;
    lignesPieces: {
        pieceId?: number | null;
        designationPds?: string;
        isCustom?: boolean;
        quantite: number;
        prix: number;
    }[];
    lignesMainDoeuvres?: {
        mainDoeuvreId?: number | null;
        nbreHeure: number;
        tarifHoraire: number;
    }[];
}
