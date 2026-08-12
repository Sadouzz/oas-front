export interface AgentMessage {
  id: number;
  expediteurId: number;
  expediteurName: string;
  contenu: string;
  dateEnvoi: string;
  lu: boolean;
  garageId: number | null;
  garageName: string | null;
}

export interface ClientConversation {
  clientId: number;
  clientName: string;
  clientPhone: string;
  lastMessage: AgentMessage | null;
  unreadCount: number;
}
