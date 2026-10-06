export interface LoginRequest {
  username?: string;
  password?: string;
}

export interface RegisterRequest {
  login: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  matricule?: string;
  type?: string;
  role?: string;
  typeClient?: 'PARTICULIER' | 'ENTREPRISE';
  raisonSociale?: string;
  numeroEntreprise?: string;
  emailEntreprise?: string;
  telephoneEntreprise?: string;
  adresseEntreprise?: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
  garageId?: number;
  garageName?: string;
}

export interface CheckAvailabilityResponse {
  available: boolean;
}
