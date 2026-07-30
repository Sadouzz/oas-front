import { Component } from '@angular/core';
import { SectionTitle } from '../../shared/components/section-title/section-title';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [SectionTitle],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  certifications = [
    { id: 1, icon: 'ISO', title: 'Qualité 9001', description: 'Un contrôle qualité implacable à chaque étape de notre intervention, garantissant des prestations sans compromis.' },
    { id: 2, icon: 'ECO', title: 'Atelier Vert', description: 'Un respect absolu de l\'environnement dans le traitement de nos déchets et l\'utilisation de nos produits.' },
    { id: 3, icon: 'SHIELD', title: 'Agrément Constructeur', description: 'Habilités par les plus grandes marques pour intervenir sur vos véhicules tout en préservant votre garantie.' },
    { id: 4, icon: 'PRO', title: 'Expertise Hybride', description: 'Habilitation électrique spéciale pour l\'intervention en toute sécurité sur les motorisations hybrides et VE.' }
  ];
}
