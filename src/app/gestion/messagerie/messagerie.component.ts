import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagerieService } from '../../services/messagerie.service';
import { AgentMessage, ClientConversation } from '../../shared/models';

const POLL_INTERVAL_MS = 15000;

@Component({
  selector: 'app-messagerie',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messagerie.component.html',
})
export class MessagerieComponent implements OnInit, OnDestroy {
  private service = inject(MessagerieService);
  private pollInterval: any;

  conversations: ClientConversation[] = [];
  selected: ClientConversation | null = null;
  thread: AgentMessage[] = [];

  loadingConversations = false;
  loadingThread = false;
  sending = false;
  draft = '';
  errorMessage = '';

  ngOnInit(): void {
    this.loadConversations();
    this.pollInterval = setInterval(() => {
      this.loadConversations();
      if (this.selected) this.loadThread(this.selected.clientId, false);
    }, POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadConversations(): void {
    this.loadingConversations = true;
    this.service.getConversations().subscribe({
      next: convs => {
        this.conversations = convs.sort((a, b) =>
          new Date(b.lastMessage?.dateEnvoi ?? 0).getTime() - new Date(a.lastMessage?.dateEnvoi ?? 0).getTime());
        this.loadingConversations = false;
      },
      error: () => { this.loadingConversations = false; },
    });
  }

  select(conv: ClientConversation): void {
    this.selected = conv;
    this.loadThread(conv.clientId, true);
  }

  private loadThread(clientId: number, showSpinner: boolean): void {
    if (showSpinner) this.loadingThread = true;
    this.service.getThread(clientId).subscribe({
      next: messages => {
        this.thread = messages;
        this.loadingThread = false;
        // Le back marque les messages du client comme lus à la lecture ; on synchronise le compteur local.
        const conv = this.conversations.find(c => c.clientId === clientId);
        if (conv) conv.unreadCount = 0;
      },
      error: () => { this.loadingThread = false; },
    });
  }

  isFromClient(message: AgentMessage): boolean {
    return this.selected != null && message.expediteurId === this.selected.clientId;
  }

  reply(): void {
    const contenu = this.draft.trim();
    if (!contenu || !this.selected) return;

    this.sending = true;
    this.errorMessage = '';

    this.service.reply(this.selected.clientId, contenu).subscribe({
      next: () => {
        this.sending = false;
        this.draft = '';
        this.loadThread(this.selected!.clientId, false);
        this.loadConversations();
      },
      error: (err: any) => {
        this.sending = false;
        this.errorMessage = err.error?.message || err.error || "Impossible d'envoyer la réponse.";
      },
    });
  }
}
