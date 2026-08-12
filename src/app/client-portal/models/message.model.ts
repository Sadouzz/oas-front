export interface Message {
  id: number;
  expediteurId: number;
  expediteurName: string;
  contenu: string;
  dateEnvoi: string;
  lu: boolean;
  garageId: number | null;
  garageName: string | null;
}

export interface MessageRequest {
  contenu: string;
  destinataireId?: number;
  garageId: number | null;
}
