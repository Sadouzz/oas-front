import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { register } from 'swiper/element/bundle';

import { SectionTitle } from '../../shared/components/section-title/section-title';
import { TireTrackComponent } from '../../shared/components/tire-track/tire-track';
import { BoltCornersComponent } from '../../shared/components/bolt-corners/bolt-corners';
import { JerrycanComponent } from '../../shared/components/jerrycan/jerrycan';
import { SpeedometerComponent } from '../../shared/components/speedometer/speedometer';

register();

type GalleryCategory = 'atelier' | 'vehicules';
type GalleryFilter = 'tout' | GalleryCategory;

interface GalleryItem {
  id: number;
  title: string;
  category: GalleryCategory;
  src: string;
}

interface BeforeAfterItem {
  id: number;
  title: string;
  description: string;
  before: string;
  after: string;
}

import { TESTIMONIALS_DATA, Testimonial } from '../../shared/data/testimonials.data';

@Component({
  selector: 'app-realisations',
  standalone: true,
  imports: [CommonModule, RouterLink, SectionTitle, TireTrackComponent, BoltCornersComponent, JerrycanComponent, SpeedometerComponent],
  templateUrl: './realisations.html',
  styleUrl: './realisations.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Realisations {
  readonly statistiques = [
    { value: 15, max: 25, suffix: '+', unit: 'ANS', label: "Années d'expérience" },
    { value: 5000, max: 6000, suffix: '+', unit: 'VOITURES', label: 'Véhicules réparés' },
    { value: 98, max: 100, suffix: '%', unit: '%', label: 'Satisfaction client' }
  ];

  readonly filters: { key: GalleryFilter; label: string }[] = [
    { key: 'tout', label: 'Tout' },
    { key: 'atelier', label: 'Photos atelier' },
    { key: 'vehicules', label: 'Photos véhicules' },
  ];

  readonly galleryItems: GalleryItem[] = [
    { id: 1, category: 'atelier', title: 'Notre atelier, entre tradition et savoir-faire', src: 'https://images.unsplash.com/photo-1649615084630-431b70a6e89a?q=80&w=900&auto=format&fit=crop' },
    { id: 2, category: 'vehicules', title: 'Intervention en cours', src: 'https://images.unsplash.com/photo-1730461749346-d75ee4d30aa1?q=80&w=900&auto=format&fit=crop' },
    { id: 3, category: 'atelier', title: 'Poste de travail équipé', src: 'https://images.unsplash.com/photo-1477333183135-292dd5b3910f?q=80&w=900&auto=format&fit=crop' },
    { id: 4, category: 'vehicules', title: 'Précision mécanique', src: 'https://images.unsplash.com/photo-1703632998797-a8d220ce58ce?q=80&w=900&auto=format&fit=crop' },
    { id: 5, category: 'atelier', title: 'Un espace pensé pour l’efficacité', src: 'https://images.unsplash.com/photo-1647299852821-40401c0b0976?q=80&w=900&auto=format&fit=crop' },
    { id: 6, category: 'vehicules', title: 'Le bon outil pour chaque intervention', src: 'https://images.unsplash.com/photo-1503791228404-a79884146f98?q=80&w=900&auto=format&fit=crop' },
    { id: 7, category: 'atelier', title: 'Clés et outils toujours prêts', src: 'https://images.unsplash.com/photo-1623055659540-42475c90e3c3?q=80&w=900&auto=format&fit=crop' },
    { id: 8, category: 'vehicules', title: 'Outils de précision', src: 'https://images.unsplash.com/photo-1745449064670-94bd0fc13df8?q=80&w=900&auto=format&fit=crop' },
  ];

  readonly beforeAfterItems: BeforeAfterItem[] = [
    {
      id: 1,
      title: 'Restauration de carrosserie',
      description: 'Débosselage, ponçage et peinture après un choc arrière : la carrosserie retrouve son aspect d’origine.',
      before: 'https://images.unsplash.com/photo-1668560764946-74af49e14847?q=80&w=900&auto=format&fit=crop',
      after: 'https://images.unsplash.com/photo-1685321429882-89980833cb82?q=80&w=900&auto=format&fit=crop',
    },
    {
      id: 2,
      title: 'Remise à neuf du compartiment moteur',
      description: 'Nettoyage complet, remplacement des durites usées et contrôle de l’ensemble des organes mécaniques.',
      before: 'https://images.unsplash.com/photo-1458942521101-2f2fb506cee3?q=80&w=900&auto=format&fit=crop',
      after: 'https://images.unsplash.com/photo-1527383418406-f85a3b146499?q=80&w=900&auto=format&fit=crop',
    },
    {
      id: 3,
      title: 'Remplacement de pneumatiques',
      description: 'Pneus usés jusqu’à la corde remplacés et équilibrés pour retrouver une adhérence optimale.',
      before: 'https://images.unsplash.com/photo-1647292882945-d5c839432d7e?q=80&w=900&auto=format&fit=crop',
      after: 'https://images.unsplash.com/photo-1685270387102-5c0fccf96ad9?q=80&w=900&auto=format&fit=crop',
    },
  ];

  readonly testimonials: Testimonial[] = TESTIMONIALS_DATA;

  activeFilter: GalleryFilter = 'tout';

  get filteredGallery(): GalleryItem[] {
    return this.activeFilter === 'tout'
      ? this.galleryItems
      : this.galleryItems.filter(item => item.category === this.activeFilter);
  }

  setFilter(filter: GalleryFilter): void {
    this.activeFilter = filter;
  }

}
