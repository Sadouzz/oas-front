import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { MagneticCarouselComponent, MagneticItem } from '../../shared/components/magnetic-carousel/magnetic-carousel';
import { HorizontalGalleryComponent, RealisationItem } from '../../shared/components/horizontal-gallery/horizontal-gallery';
import { BlogPreviewComponent, BlogArticle } from '../../shared/components/blog-preview/blog-preview';
import { register } from 'swiper/element/bundle';

register();

import { TESTIMONIALS_DATA, Testimonial } from '../../shared/data/testimonials.data';

interface Partner {
  name: string;
  logoUrl: string;
  heightClass: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink, 
    SectionTitle, 
    MagneticCarouselComponent,
    HorizontalGalleryComponent,
    BlogPreviewComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Home {
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
  testimonialsData: Testimonial[] = TESTIMONIALS_DATA;

  partners: Partner[] = [
    { name: 'Partner 1', logoUrl: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 2', logoUrl: 'https://images.unsplash.com/photo-1503376712351-1b2d3c96048c?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 3', logoUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 4', logoUrl: 'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 5', logoUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
    { name: 'Partner 6', logoUrl: 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?q=80&w=400&auto=format&fit=crop', heightClass: 'h-16 rounded-md' },
  ];

  stats = [
    { value: '15+', label: 'Années d\'expérience' },
    { value: '5000+', label: 'Véhicules réparés' },
    { value: '100%', label: 'Satisfaction client' },
    { value: '12', label: 'Experts certifiés' }
  ];

  realisationsData: RealisationItem[] = [
    {
      id: 'restauration-moteur',
      title: 'Restauration Moteur V8',
      subtitle: 'Mécanique',
      number: '01',
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1200&auto=format&fit=crop',
      date: '15 Mai 2026',
      link: '/realisations/restauration-moteur',
      description: 'Une restauration complète d\'un moteur V8 classique, incluant le remplacement des joints, la rectification des culasses et la mise au point de l\'injection pour des performances optimales.'
    },
    {
      id: 'peinture-sur-mesure',
      title: 'Peinture Sur Mesure',
      subtitle: 'Carrosserie',
      number: '02',
      image: 'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?q=80&w=1200&auto=format&fit=crop',
      date: '02 Avril 2026',
      link: '/realisations/peinture',
      description: 'Application d\'une peinture métallisée multicouches avec vernis céramique anti-rayures. Un travail de précision pour une brillance absolue.'
    },
    {
      id: 'diagnostic-complexe',
      title: 'Diagnostic Électronique',
      subtitle: 'Technologie',
      number: '03',
      image: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?q=80&w=1200&auto=format&fit=crop',
      date: '28 Février 2026',
      link: '/realisations/diagnostic',
      description: 'Résolution d\'une panne électronique complexe sur un véhicule hybride récent grâce à nos équipements de pointe et l\'expertise de nos techniciens.'
    }
  ];

  blogTitle = 'Derniers <br class="hidden md:block" /> Articles.';
  blogSubtitle = 'Le Blog OAS';
  blogDescription = "Restez informé des dernières nouveautés de l'automobile. Découvrez nos conseils d'entretien, des analyses techniques et suivez les restaurations incroyables de l'atelier <strong class='text-oas-navy-dark'>OAS</strong>.";

  blogArticles: BlogArticle[] = [
    {
        id: 1,
        imageSrc: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=800&auto=format&fit=crop',
        alt: 'Voiture classique dans l\'atelier',
        rotation: 'rotate-[-6deg]',
        title: 'L\'art de la restauration',
        date: '12 MAR 2026'
    },
    {
        id: 2,
        imageSrc: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop',
        alt: 'Mécanicien travaillant sur un moteur',
        rotation: 'rotate-[3deg]',
        title: 'L\'importance de l\'entretien régulier',
        date: '05 FÉV 2026'
    },
    {
        id: 3,
        imageSrc: 'https://images.unsplash.com/photo-1520627918841-86e57201c13d?q=80&w=800&auto=format&fit=crop',
        alt: 'Outils de diagnostic de pointe',
        rotation: 'rotate-[-4deg]',
        title: 'Nouveaux outils de diagnostic 2026',
        date: '22 JAN 2026'
    },
    {
        id: 4,
        imageSrc: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=800&auto=format&fit=crop',
        alt: 'Détail de carrosserie lustrée',
        rotation: 'rotate-[4deg]',
        title: 'Techniques de Detailing Auto',
        date: '10 JAN 2026'
    }
  ];
}
