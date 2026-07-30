import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MagneticItem } from '../magnetic-carousel/magnetic-carousel';
import { SectionTitle } from '../section-title/section-title';

@Component({
  selector: 'app-bento-services',
  standalone: true,
  imports: [CommonModule, RouterLink, SectionTitle],
  templateUrl: './bento-services.html',
})
export class BentoServicesComponent {
  @Input() items: MagneticItem[] = [];

  // Helper function to assign CSS Grid classes based on the index to create a varied Bento Box layout
  getBentoClass(index: number): string {
    // We have 14 items. Let's create a nice masonry/bento pattern for a 4-column grid.
    switch (index) {
      case 0: return 'col-span-1 md:col-span-2 row-span-2'; // Mécanique générale (Hero)
      case 1: return 'col-span-1 md:col-span-2 row-span-1'; // Diagnostic électronique (Wide)
      case 2: return 'col-span-1 md:col-span-1 row-span-1'; // Entretien (Small)
      case 3: return 'col-span-1 md:col-span-1 row-span-1'; // Vidange (Small)
      case 4: return 'col-span-1 md:col-span-2 row-span-1'; // Freinage (Wide)
      case 5: return 'col-span-1 md:col-span-1 row-span-1'; // Suspension (Small)
      case 6: return 'col-span-1 md:col-span-1 row-span-1'; // Climatisation (Small)
      case 7: return 'col-span-1 md:col-span-2 row-span-2'; // Electricité (Tall/Wide)
      case 8: return 'col-span-1 md:col-span-2 row-span-1'; // Carrosserie (Wide)
      case 9: return 'col-span-1 md:col-span-1 row-span-1'; // Peinture (Small)
      case 10: return 'col-span-1 md:col-span-1 row-span-1'; // Pneumatiques (Small)
      case 11: return 'col-span-1 md:col-span-2 row-span-1'; // Batterie (Wide)
      case 12: return 'col-span-1 md:col-span-2 row-span-2'; // Remorquage (Hero)
      case 13: return 'col-span-1 md:col-span-4 row-span-1'; // Révision constructeur (Full Wide Footer)
      default: return 'col-span-1 row-span-1';
    }
  }
}
