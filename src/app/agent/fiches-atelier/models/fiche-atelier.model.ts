export interface LigneReception {
    nom: string;
    etat: boolean | null; // true = OUI, false = NON, null = non renseigné
}

export interface LigneDefaut {
    nom: string;
    present?: boolean | null; // true = cochée, false = non cochée
    designation?: string;
}

export interface FicheAtelierRequest {
    rendezVousId?: number | null;
    clientId: number;
    vehiculeId: number;
    nomChauffeur?: string;
    telephoneChauffeur?: string;
    niveauEssence?: string;
    kilometrage?: number;
    designationTravaux?: string;
    lignesReception?: LigneReception[];
    lignesDefauts?: LigneDefaut[];
    nb?: string;
    dateSortiePrevue?: string;
    garantie?: string;
    signatureReceptionnaireBase64?: string;
    signatureBase64?: string;
    signatureSortieBase64?: string;
}

export interface FicheAtelierResponse {
    id: number;
    rendezVousId?: number | null;
    clientId: number;
    clientName: string;
    vehiculeId: number;
    vehiculeImmatriculation: string;
    garageId: number;
    nomChauffeur?: string;
    telephoneChauffeur?: string;
    niveauEssence?: string;
    kilometrage?: number;
    designationTravaux?: string;
    lignesReception?: LigneReception[];
    lignesDefauts?: LigneDefaut[];
    nb?: string;
    dateSortiePrevue?: string;
    garantie?: string;
    signatureReceptionnaireBase64?: string;
    signatureBase64?: string;
    signatureSortieBase64?: string;
    createdAt: string;
    updatedAt: string;
    hasOrdreReparation?: boolean;
}
