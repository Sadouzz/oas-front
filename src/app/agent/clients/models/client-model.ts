export interface ClientModel {
  id: number;
  matricule: string;
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  createdAt: string;
  vehiculeNumbers?: number;
  type?: string;
  role?: string;
  clientFidele?: boolean;
  montantRemise?: number | null;
  montantPlafond?: number | null;
  echeance?: number | null;
  ninea?: string | null;
  rccm?: string | null;
  rib?: string | null;
  typeClient?: 'PARTICULIER' | 'ENTREPRISE';
  raisonSociale?: string | null;
  numeroEntreprise?: string | null;
  emailEntreprise?: string | null;
  adresseEntreprise?: string | null;
}

export interface ClientListResponse {
    id: number;
    matricule: string;
    phone: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    enabled: boolean;
    createdAt: string;
    vehiculeNumbers?: number;
    clientFidele?: boolean;
    montantRemise?: number | null;
    montantPlafond?: number | null;
    echeance?: number | null;
    ninea?: string | null;
    rccm?: string | null;
    rib?: string | null;
    typeClient?: 'PARTICULIER' | 'ENTREPRISE';
    raisonSociale?: string | null;
    numeroEntreprise?: string | null;
    emailEntreprise?: string | null;
    adresseEntreprise?: string | null;
}

export interface CreateClientPayload {
  matricule?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  type?: string;
  typeClient?: 'PARTICULIER' | 'ENTREPRISE';
  raisonSociale?: string;
  numeroEntreprise?: string;
  emailEntreprise?: string;
  telephoneEntreprise?: string;
  adresseEntreprise?: string;
}

export interface UpdateClientPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface FidelePayload {
  montantRemise?: number | null;
  montantPlafond?: number | null;
  echeance?: number | null;
  ninea?: string | null;
  rccm?: string | null;
  rib?: string | null;
}
