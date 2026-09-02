import { Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgentNotification } from '../../shared/models/agent-notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationWsService {
  private client: Client | null = null;
  private notificationSubject = new Subject<AgentNotification>();
  public notifications$: Observable<AgentNotification> = this.notificationSubject.asObservable();
  private isConnected = false;

  /**
   * Initialise et active la connexion WebSocket via STOMP / SockJS.
   * S'abonne aux topics de rôle, d'agent et de file utilisateur.
   */
  connect(role?: string | null, agentId?: number | null, username?: string | null): void {
    if (this.client && this.client.active) {
      return;
    }

    const wsUrl = `${environment.apiUrl}/ws`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (msg: string) => {
        if (!environment.production) {
          // console.debug('[STOMP-WS]', msg);
        }
      },
    });

    this.client.onConnect = () => {
      this.isConnected = true;
      // console.log('✅ Connecté au WebSocket STOMP des notifications');

      const handleMessage = (message: IMessage) => {
        try {
          const notification: AgentNotification = JSON.parse(message.body);
          this.notificationSubject.next(notification);
        } catch (e) {
          console.error('Erreur parsing notification WebSocket', e);
        }
      };

      // 1. Abonnement global
      this.client?.subscribe('/topic/notifications', handleMessage);

      // 2. Abonnement par rôle (ex: /topic/roles/ROLE_AGENT/notifications et /topic/roles/AGENT/notifications)
      if (role) {
        this.client?.subscribe(`/topic/roles/${role}/notifications`, handleMessage);
        const strippedRole = role.replace(/^ROLE_/, '');
        if (strippedRole !== role) {
          this.client?.subscribe(`/topic/roles/${strippedRole}/notifications`, handleMessage);
        }
      }

      // 3. Abonnement spécifique à l'agent (ID)
      if (agentId) {
        this.client?.subscribe(`/topic/agent/${agentId}/notifications`, handleMessage);
      }

      // 4. File personnelle de l'utilisateur
      if (username) {
        this.client?.subscribe(`/user/${username}/queue/notifications`, handleMessage);
      }
      this.client?.subscribe(`/user/queue/notifications`, handleMessage);
    };

    this.client.onDisconnect = () => {
      this.isConnected = false;
      console.log('❌ Déconnecté du WebSocket STOMP des notifications');
    };

    this.client.onStompError = (frame) => {
      console.warn('⚠️ Erreur STOMP:', frame.headers['message'], frame.body);
    };

    this.client.activate();
  }

  /**
   * Déconnecte proprement le client STOMP.
   */
  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Statut actuel de connexion.
   */
  get active(): boolean {
    return this.isConnected;
  }
}
