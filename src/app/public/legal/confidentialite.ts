import { Component, ChangeDetectionStrategy } from '@angular/core';

import { SectionTitle } from '../../shared/components/section-title/section-title';

@Component({
  selector: 'app-confidentialite',
  standalone: true,
  imports: [SectionTitle],
  template: `
    <section class="py-24 bg-oas-bg min-h-[70vh]">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <app-section-title 
          mainTitle="Politique de"
          highlightedText="Confidentialité"
          subtitle="Vos données personnelles"
          align="left"
          theme="light">
        </app-section-title>
        <div class="mt-12 prose prose-lg prose-navy max-w-none">
          <h3>1. Collecte des renseignements personnels</h3>
          <p>Nous collectons les renseignements suivants : nom, prénom, adresse électronique, numéro de téléphone. Ces données sont recueillies au travers de formulaires (contact, prise de rendez-vous).</p>
          
          <h3>2. Finalité de la collecte</h3>
          <p>Vos renseignements sont collectés aux fins suivantes : suivi de la commande, informations, offres promotionnelles, statistiques, gestion des rendez-vous en atelier.</p>
          
          <h3>3. Partage des renseignements</h3>
          <p>Nous nous engageons à ne pas commercialiser les renseignements personnels collectés. Toutefois, il nous arrive de partager ces informations avec des tiers pour des raisons de maintenance technique ou de sécurité.</p>
          
          <h3>4. Droit d'opposition et de retrait</h3>
          <p>Nous nous engageons à vous offrir un droit d'opposition et de retrait quant à vos renseignements personnels. Pour pouvoir exercer ces droits, vous pouvez nous contacter via la page Contact.</p>
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
export class ConfidentialiteComponent {}
