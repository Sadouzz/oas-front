export interface LignePieceRequest {
  pieceId?: number | null;
  reference?: string | null;
  designation?: string | null;
  quantite: number;
  remisePourcentage?: number | null;
  prixUnitaire: number;
}

export interface LigneMainDoeuvreRequest {
  reference?: string | null;
  designation?: string | null;
  heures: number;
  prixUnitaire: number;
}

// Backend expects DevisPrevisionnelRequest:
// { notesReparation: string, montantTotal: BigDecimal, kilometrageVehicule: Double, vehiculeId: Long, clientId: Long }
export interface ProformaCreateRequest {
  notesReparation?: string | null;
  montantTotal: number;
  kilometrageVehicule?: number | null;
  vehiculeId?: number | null;
  clientId: number;
}

// Front-end enriched request used when sending a pro-forma from the UI.
// Backend core fields are kept but we also include optional detailed lines
// so the front-end can preserve and display them. Many backends ignore
// unknown properties, but if your backend rejects extra fields you can
// omit `lignesPieces` and `lignesMainDoeuvre` on send.
export interface DevisPrevisionnelRequest extends ProformaCreateRequest {
  lignesPieces?: LignePieceRequest[] | null;
  lignesMainDoeuvre?: LigneMainDoeuvreRequest[] | null;
}

export interface ProformaResponse {
  id: number;
  numero: string;
  date: string;
  clientId: number;
  clientNom?: string | null;
  clientTelephone?: string | null;
  clientEmail?: string | null;
  clientVille?: string | null;
  bonDeCommandeNumero?: string | null;
  vehicule?: { annee?: number; marque?: string; modele?: string; immatriculation?: string; kilometrage?: number; numeroChassie?: string } | null;
  lignesPieces?: Array<{ id?: number; reference?: string; designation?: string; quantite?: number; remisePourcentage?: number; prixUnitaire?: number; total?: number }> | null;
  lignesMainDoeuvre?: Array<{ id?: number; reference?: string; designation?: string; heures?: number; prixUnitaire?: number; total?: number }> | null;
  montantHT?: number;
  montantTVA?: number;
  timbre?: number;
  montantTTC?: number;
  observation?: string | null;
}
