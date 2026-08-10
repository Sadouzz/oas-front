export interface UserModel {
  id: number;
  matricule: string;
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  enabled: boolean;
  createdAt: string;
  role?: string;
  garage?: { id: number; nom: string };
  authorities?: { authority: string }[];
}

export interface UserUpdatePayload {
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface CreateUserPayload {
  matricule: string;
  phone: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  type: string;
  role?: string;
  garageId?: number;
}

export interface AdminUserUpdatePayload {
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  garageId?: number;
}
