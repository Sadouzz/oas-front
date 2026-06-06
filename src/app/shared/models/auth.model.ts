export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  matricule: string;
  phone: string;
  login: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  type: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  username: string;
  role: string;
}
