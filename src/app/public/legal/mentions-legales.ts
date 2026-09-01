import { Component, ChangeDetectionStrategy } from '@angular/core';

import { SectionTitle } from '../../shared/components/section-title/section-title';

@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  imports: [SectionTitle],
  template: `
    <section class="py-24 bg-oas-bg min-h-[70vh]">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <app-section-title 
          mainTitle="Termes &"
          highlightedText="Conditions"
          subtitle="Mentions légales"
          align="left"
          theme="light">
        </app-section-title>
        <div class="mt-12 prose prose-lg prose-navy max-w-none">
          <h3>1. Présentation du site</h3>
          <p>Le site Orient Auto Service est édité par OAS, entreprise spécialisée dans l'entretien et la réparation automobile.</p>
          
          <h3>2. Conditions générales d'utilisation</h3>
          <p>L'utilisation du site implique l'acceptation pleine et entière des conditions générales d'utilisation décrites ci-après.</p>
          
          <h3>3. Propriété intellectuelle</h3>
          <p>Orient Auto Service est propriétaire des droits de propriété intellectuelle ou détient les droits d'usage sur tous les éléments accessibles sur le site.</p>
          
          <h3>4. Limitations de responsabilité</h3>
          <p>Orient Auto Service ne pourra être tenu responsable des dommages directs et indirects causés au matériel de l'utilisateur, lors de l'accès au site.</p>
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
export class MentionsLegalesComponent {}
