import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { MagneticCarouselComponent, MagneticItem } from '../../shared/components/magnetic-carousel/magnetic-carousel';
import { HorizontalGalleryComponent, RealisationItem } from '../../shared/components/horizontal-gallery/horizontal-gallery';
import { BlogPreviewComponent, BlogArticle } from '../../shared/components/blog-preview/blog-preview';
import { register } from 'swiper/element/bundle';
import { BlogService } from '../../services/blog.service';
import { PartenaireService } from '../../services/partenaire.service';
import { FournisseurService } from '../../services/fournisseur.service';
import { PartenaireModel, FournisseurModel } from '../../shared/models';

register();

import { TESTIMONIALS_DATA, Testimonial } from '../../shared/data/testimonials.data';

import { SpeedometerComponent } from '../../shared/components/speedometer/speedometer';
import { TireTrackComponent } from '../../shared/components/tire-track/tire-track';
import { BoltCornersComponent } from '../../shared/components/bolt-corners/bolt-corners';
import { MechanicalGearsComponent } from '../../shared/components/mechanical-gears/mechanical-gears';
import { JerrycanComponent } from '../../shared/components/jerrycan/jerrycan';

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
    BlogPreviewComponent,
    SpeedometerComponent,
    TireTrackComponent,
    BoltCornersComponent,
    MechanicalGearsComponent,
    JerrycanComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Home implements OnInit {
  servicesImages: MagneticItem[] = [
  {
    id: 1,
    title: 'Mécanique',
    slug: 'mecanique',
    description: 'Réparation et entretien de tous types de moteurs, boîtes de vitesses et organes mécaniques.',
    src: 'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 2,
    title: 'Électricité',
    slug: 'electricite',
    description: 'Diagnostic et réparation des systèmes électriques, alternateurs, démarreurs et batteries.',
    src: 'https://images.unsplash.com/photo-1621217736657-3a139a066440?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 3,
    title: 'Vidange',
    slug: 'vidange',
    description: 'Vidange moteur, remplacement des filtres et entretien périodique.',
    src: 'https://images.unsplash.com/photo-1632823471565-1ec2a74c2e6f?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 4,
    title: 'Climatisation',
    slug: 'climatisation',
    description: 'Recharge de gaz, entretien et réparation des systèmes de climatisation.',
    src: 'https://images.unsplash.com/photo-1579893963473-cbcf2eb98b4b?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 5,
    title: 'Tôlerie',
    slug: 'tolerie',
    description: 'Redressage de carrosserie, réparation des chocs et remise en état des éléments de tôlerie.',
    src: 'https://images.unsplash.com/photo-1590498305417-640a3dd90dcb?q=80&w=800&auto=format&fit=crop'
  },
  {
    id: 6,
    title: 'Peinture',
    slug: 'peinture',
    description: 'Peinture automobile complète, retouches et finitions professionnelles.',
    src: 'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?q=80&w=800&auto=format&fit=crop'
  }
];
  
  testimonialsData: Testimonial[] = TESTIMONIALS_DATA;

  partners: Partner[] = [];
  fournisseurs: FournisseurModel[] = [];

  stats = [
    { value: 18, suffix: '+', max: 25, unit: 'ANS', label: "Années d'expérience" },
    { value: 5000, suffix: '+', max: 6000, unit: 'VOITURES', label: 'Véhicules réparés' },
    { value: 98, suffix: '%', max: 100, unit: '%', label: 'Satisfaction client' }
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

  blogArticles: BlogArticle[] = [];
  private blogService = inject(BlogService);
  private partenaireService = inject(PartenaireService);
  private fournisseurService = inject(FournisseurService);

  ngOnInit(): void {
    const rotations = ['rotate-[-6deg]', 'rotate-[3deg]', 'rotate-[-4deg]', 'rotate-[4deg]'];
    this.blogService.getAll().subscribe({
      next: (data) => {
        // Prendre les 4 derniers articles du blog
        this.blogArticles = data.slice(0, 4).map((post, idx) => ({
          id: post.id,
          imageSrc: this.getArticleImage(post.images),
          alt: post.title,
          rotation: rotations[idx % rotations.length],
          title: post.title,
          date: this.formatDate(post.datePublication)
        }));
      },
      error: (err) => {
        console.error('Erreur lors du chargement des articles de blog sur la page d\'accueil:', err);
      }
    });

    this.partenaireService.getAll().subscribe({
      next: (data) => {
        this.partners = data.map(p => ({
          name: p.nom,
          logoUrl: p.logo && p.logo !== '' ? p.logo : 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop',
          heightClass: 'h-16 rounded-md'
        }));
      },
      error: (err) => {
        console.error('Erreur chargement partenaires:', err);
      }
    });

    this.fournisseurService.getAll().subscribe({
      next: (data) => {
        this.fournisseurs = data;
      },
      error: (err) => {
        console.error('Erreur chargement fournisseurs:', err);
      }
    });
  }

  private getArticleImage(imageKey: string): string {
    const mapping: Record<string, string> = {
      road: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=800&auto=format&fit=crop',
      brakes: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=800&auto=format&fit=crop',
      air: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=800&auto=format&fit=crop',
      garage: 'https://images.unsplash.com/photo-1520627918841-86e57201c13d?q=80&w=800&auto=format&fit=crop',
      dashboard: 'https://images.unsplash.com/photo-1635835694200-a4a350080648?q=80&w=800&auto=format&fit=crop',
      oil: 'https://images.unsplash.com/photo-1632823471565-1ec2a74c2e6f?q=80&w=800&auto=format&fit=crop',
      tyres: 'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?q=80&w=800&auto=format&fit=crop',
      tools: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=800&auto=format&fit=crop'
    };
    return mapping[imageKey] || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=800&auto=format&fit=crop';
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase();
    } catch (e) {
      return dateStr;
    }
  }
}
