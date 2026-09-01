import { Component, Input } from '@angular/core';


/**
 * Icônes SVG intégrées (pas de dépendance externe type Font Awesome).
 * Ajoute un "case" ici pour chaque nouvelle icône nécessaire.
 *
 * ⚠️ Ce fichier est partagé entre plusieurs pages (rdv, partenaires, contact...).
 * Idéalement, place-le une seule fois dans un dossier partagé
 * (ex: src/app/shared/icon/icon.ts) et importe-le depuis là partout,
 * plutôt que d'en garder une copie par page.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="app-icon-svg">
    
      <ng-container>
        @switch (name) {
          <!-- Créer un compte -->
          @case ('user-plus') {
            <ng-container>
              <path d="M16 19v-1.5a4.5 4.5 0 0 0-4.5-4.5H7A4.5 4.5 0 0 0 2.5 17.5V19"/>
              <circle cx="9.5" cy="8" r="3.5"/>
              <path d="M19 7v5M21.5 9.5h-5"/>
            </ng-container>
          }
          <!-- Choisir un créneau / Gestion des rendez-vous / RDV -->
          @case ('calendar-check') {
            <ng-container>
              <rect x="3" y="5" width="18" height="16" rx="2.5"/>
              <path d="M3 9.5h18M8 3v4M16 3v4"/>
              <path d="M9 14l2 2 4-4.2"/>
            </ng-container>
          }
          <!-- Confirmation -->
          @case ('check-circle') {
            <ng-container>
              <circle cx="12" cy="12" r="9"/>
              <path d="M8.2 12.3l2.6 2.6 5-5.4"/>
            </ng-container>
          }
          <!-- Expertise / Mécanique -->
          @case ('wrench') {
            <ng-container>
              <path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3.5 17.2a1.6 1.6 0 0 0 2.3 2.3l5.8-5.8a4 4 0 0 0 5.1-5.4L14 11l-3-3 2.7-2.7z"/>
            </ng-container>
          }
          <!-- Rapidité -->
          @case ('timer') {
            <ng-container>
              <circle cx="12" cy="13" r="8"/>
              <path d="M12 9v4l3 2M9.5 2h5M12 2v2"/>
            </ng-container>
          }
          <!-- Garantie -->
          @case ('shield-heart') {
            <ng-container>
              <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"/>
              <path d="M12 15.5s-2.6-1.6-2.6-3.5a1.6 1.6 0 0 1 2.6-1.2 1.6 1.6 0 0 1 2.6 1.2c0 1.9-2.6 3.5-2.6 3.5z"/>
            </ng-container>
          }
          <!-- Assistance -->
          @case ('headphones') {
            <ng-container>
              <path d="M4 14v-2a8 8 0 0 1 16 0v2"/>
              <rect x="2.5" y="14" width="4" height="6" rx="1.5"/>
              <rect x="17.5" y="14" width="4" height="6" rx="1.5"/>
              <path d="M20 20a3 3 0 0 1-3 3h-3"/>
            </ng-container>
          }
          <!-- Suivi des devis -->
          @case ('file-text') {
            <ng-container>
              <path d="M7 2.5h7l4 4V21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/>
              <path d="M14 2.5V7h4M9 12h6M9 16h6"/>
            </ng-container>
          }
          <!-- Factures / Demander un devis -->
          @case ('file-check') {
            <ng-container>
              <path d="M7 2.5h7l4 4V21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z"/>
              <path d="M14 2.5V7h4M9.3 14.2l1.8 1.8 3.6-3.8"/>
            </ng-container>
          }
          <!-- Historique véhicule -->
          @case ('car') {
            <ng-container>
              <path d="M4.5 16.5V12l2-5h11l2 5v4.5"/>
              <path d="M3.5 16.5h17v2.5a1 1 0 0 1-1 1H17a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-2.5z"/>
              <circle cx="7.5" cy="16.3" r="1.3"/>
              <circle cx="16.5" cy="16.3" r="1.3"/>
            </ng-container>
          }
          <!-- Notifications -->
          @case ('bell') {
            <ng-container>
              <path d="M6 9.5a6 6 0 0 1 12 0v4l1.8 3.2H4.2L6 13.5v-4z"/>
              <path d="M9.5 19.5a2.5 2.5 0 0 0 5 0"/>
            </ng-container>
          }
          <!-- Compte sécurisé -->
          @case ('shield') {
            <ng-container>
              <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"/>
              <path d="M9.3 12.2l1.9 1.9 3.6-3.9"/>
            </ng-container>
          }
          <!-- Électricité -->
          @case ('bolt') {
            <ng-container>
              <path d="M13 2.5L4.5 13.5h6L10 21.5l8.5-11.5h-6L13 2.5z"/>
            </ng-container>
          }
          <!-- Climatisation -->
          @case ('snowflake') {
            <ng-container>
              <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/>
              <path d="M12 2l-2 2M12 2l2 2M12 22l-2-2M12 22l2-2"/>
              <path d="M4.5 6.5l2.7.3M4.5 6.5l.5-2.7M19.5 6.5l-2.7.3M19.5 6.5l-.5-2.7"/>
              <path d="M4.5 17.5l2.7-.3M4.5 17.5l.5 2.7M19.5 17.5l-2.7-.3M19.5 17.5l-.5 2.7"/>
            </ng-container>
          }
          <!-- Carrosserie & peinture -->
          @case ('spray') {
            <ng-container>
              <path d="M8 6.5V4a1.5 1.5 0 0 1 1.5-1.5h1A1.5 1.5 0 0 1 12 4v2.5"/>
              <path d="M7 6.5h6l1.5 3v11a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1v-11l1.5-3z"/>
              <path d="M17 8h3M18 5.3l2.1-1.3M18 11l2.3 1"/>
            </ng-container>
          }
          <!-- Techniciens qualifiés -->
          @case ('user-gear') {
            <ng-container>
              <circle cx="9" cy="8" r="3.5"/>
              <path d="M3.5 19v-1a5.5 5.5 0 0 1 5.5-5.5h1"/>
              <circle cx="18" cy="16.5" r="2.4"/>
              <path d="M18 12.8v1.1M18 18.1v1.1M14.9 16.5H16M20 16.5h1.1M15.4 13.9l.8.8M19.8 18.3l.8.8M15.4 19.1l.8-.8M19.8 14.7l.8-.8"/>
            </ng-container>
          }
          <!-- Diagnostic électronique -->
          @case ('microchip') {
            <ng-container>
              <rect x="7" y="7" width="10" height="10" rx="1.5"/>
              <rect x="10" y="10" width="4" height="4" rx="0.5"/>
              <path d="M9 3v2M12 3v2M15 3v2M9 19v2M12 19v2M15 19v2M3 9h2M3 12h2M3 15h2M19 9h2M19 12h2M19 15h2"/>
            </ng-container>
          }
          <!-- Pièces de qualité -->
          @case ('award') {
            <ng-container>
              <circle cx="12" cy="9" r="5.5"/>
              <path d="M9 13.8L7.5 21l4.5-2.4 4.5 2.4-1.5-7.2"/>
            </ng-container>
          }
          <!-- Service rapide / Horaires -->
          @case ('clock') {
            <ng-container>
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3.5 2"/>
            </ng-container>
          }
          <!-- Partenaires / confiance -->
          @case ('handshake') {
            <ng-container>
              <path d="M2.5 12.5l4-3.5a2 2 0 0 1 2.6 0l2.4 2"/>
              <path d="M21.5 12.5l-4-3.5a2 2 0 0 0-2.6 0l-4.6 4a1.4 1.4 0 0 0 1.8 2.1l3-2.4"/>
              <path d="M9.5 12.5l2.3 2a1.4 1.4 0 0 0 1.9-2l-.2-.2"/>
              <path d="M4.5 9.5L2 11.8V15l3 2.5M19.5 9.5L22 11.8V15l-3 2.5"/>
            </ng-container>
          }
          <!-- Flèche carrousel : précédent -->
          @case ('chevron-left') {
            <ng-container>
              <path d="M15 5l-7 7 7 7"/>
            </ng-container>
          }
          <!-- Flèche carrousel : suivant -->
          @case ('chevron-right') {
            <ng-container>
              <path d="M9 5l7 7-7 7"/>
            </ng-container>
          }
          <!-- Téléphone -->
          @case ('phone') {
            <ng-container>
              <path d="M5 4.5h3.2l1.3 4-1.9 1.6a11 11 0 0 0 5.3 5.3l1.6-1.9 4 1.3V18a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z"/>
            </ng-container>
          }
          <!-- WhatsApp -->
          @case ('whatsapp') {
            <ng-container>
              <path d="M6.5 20.5L3.5 21l.6-3a8.5 8.5 0 1 1 3 3l-.6.5z"/>
              <path d="M9 8.7c0-.5.4-1 .9-1h.6c.3 0 .6.2.7.5l.6 1.5c.1.3 0 .6-.2.8l-.7.7a6.5 6.5 0 0 0 3 3l.7-.7c.2-.2.5-.3.8-.2l1.5.6c.3.1.5.4.5.7v.6c0 .5-.5.9-1 .9-3.6 0-7-3.4-7-7z"/>
            </ng-container>
          }
          <!-- Email -->
          @case ('mail') {
            <ng-container>
              <rect x="3" y="5.5" width="18" height="13" rx="2"/>
              <path d="M3.5 6.5L12 13l8.5-6.5"/>
            </ng-container>
          }
          <!-- Localisation / adresse -->
          @case ('map-pin') {
            <ng-container>
              <path d="M12 21.5s7-6.2 7-11.5a7 7 0 1 0-14 0c0 5.3 7 11.5 7 11.5z"/>
              <circle cx="12" cy="10" r="2.4"/>
            </ng-container>
          }
          <!-- Envoyer un message -->
          @case ('paper-plane') {
            <ng-container>
              <path d="M3 11.5L20.5 3.5 13 20.8l-2.4-6.2L3 11.5z"/>
              <path d="M10.6 14.6L20.5 3.5"/>
            </ng-container>
          }
          <!-- Itinéraire -->
          @case ('location-arrow') {
            <ng-container>
              <path d="M3.5 11l17-8-8 17-2.3-6.7L3.5 11z"/>
            </ng-container>
          }
          <!-- Chargement -->
          @case ('spinner') {
            <ng-container>
              <path d="M12 3v3.5" opacity="1"/>
              <path d="M16.6 7.4l2.5-2.5" opacity=".9"/>
              <path d="M17.5 12H21" opacity=".75"/>
              <path d="M16.6 16.6l2.5 2.5" opacity=".6"/>
              <path d="M12 17.5V21" opacity=".45"/>
              <path d="M4.9 19.1l2.5-2.5" opacity=".3"/>
              <path d="M3 12h3.5" opacity=".2"/>
              <path d="M4.9 4.9l2.5 2.5" opacity=".1"/>
            </ng-container>
          }
        }
      </ng-container>
    </svg>
    `,
  styles: [`
    :host{ display:inline-flex; align-items:center; justify-content:center; line-height:0; }
    .app-icon-svg{ display:block; }
    :host(.spin) .app-icon-svg{ animation: app-icon-spin .9s linear infinite; }
    @keyframes app-icon-spin{ to{ transform:rotate(360deg); } }
  `]
})
export class IconComponent {
  @Input() name = '';
  @Input() size = 28;
}