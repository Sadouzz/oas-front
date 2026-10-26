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
  echeance?: number | null;
  montantPlafondEcheance?: number | null;
  ninea?: string | null;
  rccm?: string | null;
  rib?: string | null;
}

export interface CompteFinancierPayload {
  raisonSociale: string;
  ninea: string;
  echeanceJours: number;
  plafondPeriode: number;
  rccm: string;
  rib: string;
  actif: boolean;
}

export interface CompteFinancierResponse {
  clientId: number;
  typeClient: 'PARTICULIER' | 'ENTREPRISE';
  raisonSociale: string | null;
  ninea: string | null;
  compteActif: boolean;
  compteExiste: boolean;
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

export interface PortefeuilleClientResponse {
  clientId: number;
  solde: number;
  dateCreation: string | null;
  dateModification: string | null;
  mouvements: MouvementPortefeuilleResponse[];
}

export interface MouvementPortefeuilleResponse {
  id: number;
  type: 'ALIMENTATION' | 'PAIEMENT_FACTURE';
  montant: number;
  modePaiement: string | null;
  commentaire: string | null;
  factureId: number | null;
  factureNumero: string | null;
  recuId: number | null;
  recuNumero: string | null;
  acteurId: number | null;
  dateCreation: string;
}
