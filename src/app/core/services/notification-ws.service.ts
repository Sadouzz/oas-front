import { inject, Injectable } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AgentNotification } from '../../shared/models/agent-notification.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationWsService {
  private authService = inject(AuthService);
  private client: Client | null = null;
  private notificationSubject = new Subject<AgentNotification>();
  public notifications$: Observable<AgentNotification> = this.notificationSubject.asObservable();
  private isConnected = false;

  /**
   * Initialise et active la connexion WebSocket via STOMP / SockJS.
   * S'abonne à la file privée de l'utilisateur authentifié.
   */
  connect(): void {
    if (this.client && this.client.active) {
      return;
    }

    const wsUrl = `${environment.apiUrl}/ws`;

    this.client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      beforeConnect: async client => {
        const token = this.authService.getToken();
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },
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

      // Spring résout cette destination vers la session de l'utilisateur
      // authentifié lors de la connexion WebSocket.
      this.client?.subscribe('/user/queue/notifications', handleMessage);
    };

    this.client.onDisconnect = () => {
      this.isConnected = false;
    };

    this.client.onWebSocketClose = () => { this.isConnected = false; };
    this.client.onWebSocketError = () => { this.isConnected = false; };

    this.client.onStompError = (frame) => {
      this.isConnected = false;
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
