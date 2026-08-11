import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { MagneticItem } from '../../shared/components/magnetic-carousel/magnetic-carousel';
import { TireTrackComponent } from '../../shared/components/tire-track/tire-track';
import { PistonAccordionComponent } from '../../shared/components/piston-accordion/piston-accordion';
import { SheetMetalCardComponent } from '../../shared/components/sheet-metal-card/sheet-metal-card';
import { BoltCornersComponent } from '../../shared/components/bolt-corners/bolt-corners';
import { MechanicalGearsComponent } from '../../shared/components/mechanical-gears/mechanical-gears';
import { IconComponent } from '../../shared/icon/icon';
import { register } from 'swiper/element/bundle';

register();

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule, 
    SectionTitle, 
    TireTrackComponent, 
    PistonAccordionComponent, 
    SheetMetalCardComponent, 
    BoltCornersComponent,
    MechanicalGearsComponent,
    IconComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  activeChapter: number | null = 1;

  toggleChapter(chapter: number) {
    this.activeChapter = this.activeChapter === chapter ? null : chapter;
  }

  certifications = [
    { id: 1, icon: 'ISO', title: 'Qualité 9001', description: 'Un contrôle qualité implacable à chaque étape de notre intervention, garantissant des prestations sans compromis.' },
    { id: 2, icon: 'ECO', title: 'Atelier Vert', description: 'Un respect absolu de l\'environnement dans le traitement de nos déchets et l\'utilisation de nos produits.' },
    { id: 3, icon: 'SHIELD', title: 'Agrément Constructeur', description: 'Habilités par les plus grandes marques pour intervenir sur vos véhicules tout en préservant votre garantie.' },
    { id: 4, icon: 'PRO', title: 'Expertise Hybride', description: 'Habilitation électrique spéciale pour l\'intervention en toute sécurité sur les motorisations hybrides et VE.' }
  ];

  servicesImages: MagneticItem[] = [
    { id: 1, title: 'Mécanique générale', slug: 'mecanique-generale', description: 'Toutes les réparations mécaniques pour votre moteur et boîte de vitesses.', src: 'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=800&auto=format&fit=crop' },
    { id: 2, title: 'Diagnostic électronique', slug: 'diagnostic-electronique', description: 'Lecture des codes défauts avec valises multimarques de dernière génération.', src: 'https://images.unsplash.com/photo-1635835694200-a4a350080648?q=80&w=800&auto=format&fit=crop' },
    { id: 3, title: 'Entretien & vidange', slug: 'entretien-vidange', description: 'Entretien régulier et changement d\'huile pour préserver votre moteur.', src: 'https://images.unsplash.com/photo-1632823471565-1ec2a74c2e6f?q=80&w=800&auto=format&fit=crop' },
    { id: 4, title: 'Freinage & suspension', slug: 'freinage-suspension', description: 'Contrôle et remplacement des systèmes de freinage et suspension.', src: 'https://images.unsplash.com/photo-1486262715619-6708146fb236?q=80&w=800&auto=format&fit=crop' },
    { id: 5, title: 'Climatisation', slug: 'climatisation', description: 'Recharge de gaz, recherche de fuite et désinfection du circuit.', src: 'https://images.unsplash.com/photo-1579893963473-cbcf2eb98b4b?q=80&w=800&auto=format&fit=crop' },
    { id: 6, title: 'Électricité & batterie', slug: 'electricite-batterie', description: 'Test, remplacement de batterie et diagnostic électrique complet.', src: 'https://images.unsplash.com/photo-1621217736657-3a139a066440?q=80&w=800&auto=format&fit=crop' },
    { id: 7, title: 'Carrosserie & peinture', slug: 'carrosserie-peinture', description: 'Réparation suite à collision, redressage et peinture cabine.', src: 'https://images.unsplash.com/photo-1590498305417-640a3dd90dcb?q=80&w=800&auto=format&fit=crop' },
    { id: 8, title: 'Pneumatiques', slug: 'pneumatiques', description: 'Montage, équilibrage et réparation de vos pneus toutes saisons.', src: 'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?q=80&w=800&auto=format&fit=crop' },
    { id: 9, title: 'Remorquage', slug: 'remorquage', description: 'Service de dépannage et remorquage de votre véhicule en panne.', src: 'https://images.unsplash.com/photo-1520624029259-71ee51a1d137?q=80&w=800&auto=format&fit=crop' }
  ];
}
