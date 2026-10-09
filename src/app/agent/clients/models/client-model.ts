export interface ClientModel {
  id: number;
  matricule: string;
  phone: string;
  username?: string;
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
  montantPlafondEcheance?: number | null;
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
    montantPlafondEcheance?: number | null;
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
  montantPlafondEcheance?: number | null;
  ninea?: string | null;
  rccm?: string | null;
  rib?: string | null;
}

export interface CompteFinancierPayload {
  raisonSociale: string;
  ninea: string;
  remisePourcentage: number;
  plafondCredit: number | null;
  echeanceJours: number | null;
  plafondPeriode: number | null;
  rccm?: string | null;
  rib?: string | null;
  actif?: boolean;
}

export interface CompteFinancierResponse {
  clientId: number;
  typeClient: 'PARTICULIER' | 'ENTREPRISE';
  raisonSociale: string | null;
  ninea: string | null;
  compteActif: boolean;
  compteExiste: boolean;
  remisePourcentage: number;
  soldeCredit: number;
  plafondCredit: number | null;
  echeanceJours: number | null;
  plafondPeriode: number | null;
  encoursImpayes: number;
  facturePeriode: number;
  facturesEnRetard: boolean;
  reservationClientAutorisee: boolean;
  motifBlocageReservation: string | null;
  rccm: string | null;
  rib: string | null;
  compteCreeLe: string | null;
}

export interface MouvementCreditResponse {
  id: number;
  montant: number;
  commentaire: string | null;
  acteurId: number | null;
  dateCreation: string;
}
