export interface Garage {
    id: number;
    nom: string;
    libelle?: string;
    ville?: string;
    localite: string;
    adresse?: string;
    contact?: string;
    prefixe?: string;
    numeroFixe?: string;
    numeroWhatsapp?: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
    archived?: boolean;
}
