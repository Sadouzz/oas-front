import { Component, ChangeDetectionStrategy } from '@angular/core';

import { SectionTitle } from '../../shared/components/section-title/section-title';

@Component({
  selector: 'app-cookies',
  standalone: true,
  imports: [SectionTitle],
  template: `
    <section class="py-24 bg-oas-bg min-h-[70vh]">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <app-section-title 
          mainTitle="Politique des"
          highlightedText="Cookies"
          subtitle="Vos préférences"
          align="left"
          theme="light">
        </app-section-title>
        <div class="mt-12 prose prose-lg prose-navy max-w-none">
          <h3>1. Qu'est-ce qu'un cookie ?</h3>
          <p>Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de la visite d'un site web ou de la consultation d'une publicité.</p>
          
          <h3>2. Les cookies utilisés sur ce site</h3>
          <p>Nous utilisons des cookies strictement nécessaires au fonctionnement du site (gestion de session, préférences de cookies). Nous pouvons également utiliser des cookies de mesure d'audience pour améliorer l'expérience utilisateur.</p>
          
          <h3>3. Gestion de vos préférences</h3>
          <p>Vous pouvez à tout moment modifier vos préférences concernant les cookies directement depuis les paramètres de votre navigateur ou en supprimant l'historique de votre navigation.</p>
          
          <h3>4. Durée de conservation</h3>
          <p>Les cookies sont conservés pour une durée maximale de 13 mois conformément à la réglementation en vigueur.</p>
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .prose h3 { color: var(--color-oas-navy-dark); font-weight: 800; margin-top: 2rem; margin-bottom: 1rem; }
    .prose p { color: var(--color-oas-ink2); margin-bottom: 1rem; line-height: 1.7; }
  `]
})
export class CookiesComponent {}
