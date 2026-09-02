import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientMessageService } from './client-message.service';
import { ClientPortalService } from '../layout/client-portal.service';
import { Message } from '../models';
import { AlertComponent } from '../../shared/components/alert/alert.component';

const POLL_INTERVAL_MS = 15000;

@Component({
  selector: 'app-client-messagerie-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent],
  templateUrl: './client-messagerie-widget.component.html',
})
export class ClientMessagerieWidgetComponent implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private messageService = inject(ClientMessageService);
  private portalService = inject(ClientPortalService);
  private pollInterval: any;
  private knownIds = new Set<number>();

  isOpen = false;
  messages: Message[] = [];
  myId: number | null = null;
  draft = '';
  loading = false;
  sending = false;
  errorMessage = '';
  unreadCount = 0;

  ngOnInit(): void {
    this.portalService.getMe().subscribe({ next: me => this.myId = me.id });
    this.load(true);
    this.pollInterval = setInterval(() => this.load(false), POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  private load(showSpinner: boolean): void {
    if (showSpinner) this.loading = true;
    this.messageService.getThread().subscribe({
      next: messages => {
        if (!showSpinner && !this.isOpen) {
          const newFromAgent = messages.filter(m => m.expediteurId !== this.myId && !this.knownIds.has(m.id));
          this.unreadCount += newFromAgent.length;
        }
        messages.forEach(m => this.knownIds.add(m.id));
        this.messages = messages;
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      this.load(this.messages.length === 0);
    }
  }

  close(): void {
    this.isOpen = false;
  }

  isMine(message: Message): boolean {
    return message.expediteurId === this.myId;
  }

  send(): void {
    const contenu = this.draft.trim();
    if (!contenu) return;

    this.sending = true;
    this.errorMessage = '';

    this.messageService.send({ contenu }).subscribe({
      next: () => {
        this.sending = false;
        this.draft = '';
        this.load(false);
      },
      error: (err: any) => {
        this.sending = false;
        this.errorMessage = err.error?.message || "Impossible d'envoyer le message.";
      },
    });
  }
}
