import { Component, OnInit } from '@angular/core';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cookie-popup',
  standalone: true,
  imports: [RouterModule],
  template: `
    @if (showPopup) {
      <div class="fixed bottom-0 left-0 w-full z-[9999] bg-white border-t border-oas-line shadow-[0_-10px_40px_rgba(12,39,66,0.08)] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transform transition-transform duration-500 translate-y-0">
        <div class="flex-1 max-w-4xl">
          <h3 class="text-lg font-bold text-oas-navy mb-2">Vos préférences de navigation</h3>
          <p class="text-sm text-oas-ink2 leading-relaxed">
            Nous utilisons des cookies pour améliorer votre expérience sur notre site, analyser le trafic et vous proposer des services adaptés.
            En cliquant sur "Accepter", vous consentez à l'utilisation de ces cookies.
            Vous pouvez gérer vos préférences ou en savoir plus dans notre <a routerLink="/cookies" class="text-oas-accent hover:underline">politique de cookies</a>.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-4 shrink-0 w-full md:w-auto">
          <button (click)="decline()" class="px-6 py-3 text-sm font-bold tracking-wider uppercase text-oas-navy border-2 border-oas-line hover:border-oas-navy hover:bg-oas-navy hover:text-white transition-colors duration-300 w-full sm:w-auto">
            Refuser
          </button>
          <button (click)="accept()" class="px-6 py-3 text-sm font-bold tracking-wider uppercase bg-oas-accent text-white hover:bg-oas-accent-dark transition-colors duration-300 w-full sm:w-auto">
            Accepter
          </button>
        </div>
      </div>
    }
    `
})
export class CookiePopupComponent implements OnInit {
  showPopup = false;

  ngOnInit() {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setTimeout(() => {
        this.showPopup = true;
      }, 1000);
    }
  }

  accept() {
    localStorage.setItem('cookieConsent', 'accepted');
    this.showPopup = false;
  }

  decline() {
    localStorage.setItem('cookieConsent', 'declined');
    this.showPopup = false;
  }
}
