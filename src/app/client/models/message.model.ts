export interface Message {
  id: number;
  expediteurId: number;
  expediteurName: string;
  contenu: string;
  dateEnvoi: string;
  lu: boolean;
}

export interface MessageRequest {
  contenu: string;
  destinataireId?: number;
}
