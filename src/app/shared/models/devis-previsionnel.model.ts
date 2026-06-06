export interface DevisPrevisionnel {
  id: number;
  notesReparation: string;
  montantTotal: number;
  kilometrageVehicule: number;
  createdAt: string;
  vehicule: { id: number; immatriculation: string; marque: string; modele: string } | null;
  client: { id: number; firstName: string; lastName: string; phone: string } | null;
}

export interface DevisPrevisionnelRequest {
  notesReparation: string;
  montantTotal: number;
  kilometrageVehicule: number;
  vehiculeId: number;
  clientId: number;
}
