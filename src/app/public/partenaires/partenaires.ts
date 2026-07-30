import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import AOS from 'aos';

import { IconComponent } from '../../shared/icon/icon';

@Component({
  selector: 'app-partenaires',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './partenaires.html',
  styleUrls: ['./partenaires.css']
})
export class Partenaires implements OnInit, AfterViewInit, OnDestroy {

  marques = [
    {
      nom: 'Mercedes-Benz',
      image: '/assets/images/garage1.jpg',
      logo: '/assets/oas-logo.svg',
      description: 'Spécialiste de l’entretien, du diagnostic électronique et de la réparation des véhicules Mercedes-Benz.'
    },
    {
      nom: 'Porsche',
      image: '/assets/images/garage2.jpg',
      logo: '/assets/oas-logo.svg',
      description: 'Maintenance et réparations réalisées dans le respect des exigences des véhicules Porsche.'
    },
    {
      nom: 'Opel',
      image: '/assets/images/garage3.jpg',
      logo: '/assets/oas-logo.svg',
      description: 'Entretien mécanique, électronique et maintenance préventive pour les modèles Opel.'
    },
    {
      nom: 'Land Rover',
      image: '/assets/images/garage1.jpg',
      logo: '/assets/oas-logo.svg',
      description: 'Diagnostic, entretien et réparation des véhicules tout-terrain et SUV Land Rover.'
    },
    {
      nom: 'BMW',
      image: '/assets/images/garage2.jpg',
      logo: '/assets/oas-logo.svg',
      description: 'Interventions sur les véhicules BMW avec des outils de diagnostic adaptés.'
    },
    {
      nom: 'Audi',
      image: '/assets/images/garage3.jpg',
      logo: '/assets/oas-logo.svg',
      description: 'Réparations et entretien pour l’ensemble de la gamme Audi.'
    },
    {
      nom: 'Volkswagen',
      image: '/assets/images/garage1.jpg',
      logo: '/assets/oas-logo.svg',
      description: 'Maintenance complète et suivi technique des véhicules Volkswagen.'
    }
  ];

  expertises = [
    {
      icone: 'wrench',
      titre: 'Mécanique',
      texte: 'Entretien, réparation moteur, freinage, suspension et transmission.'
    },
    {
      icone: 'bolt',
      titre: 'Électricité',
      texte: 'Diagnostic électronique, batterie, alternateur et systèmes électriques.'
    },
    {
      icone: 'snowflake',
      titre: 'Climatisation',
      texte: 'Recharge, entretien et réparation complète du système de climatisation.'
    },
    {
      icone: 'spray',
      titre: 'Carrosserie & Peinture',
      texte: 'Rénovation, peinture automobile et remise en état après sinistre.'
    }
  ];

  avantages = [
    {
      icone: 'user-gear',
      titre: 'Techniciens qualifiés'
    },
    {
      icone: 'microchip',
      titre: 'Diagnostic électronique'
    },
    {
      icone: 'award',
      titre: 'Pièces de qualité'
    },
    {
      icone: 'clock',
      titre: 'Service rapide'
    }
  ];

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      once: true,
      easing: 'ease-in-out'
    });
  }

  /* ==========================================================
     CARROUSEL DES MARQUES
  ========================================================== */

  @ViewChild('brandsTrack') brandsTrack?: ElementRef<HTMLDivElement>;

  activeSlide = 0;
  private autoplayId: any = null;
  private readonly autoplayDelay = 4500;

  ngAfterViewInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  /** Largeur d'une carte + son gap, utilisée pour tous les calculs de défilement */
  private getStep(): number {
    const track = this.brandsTrack?.nativeElement;
    if (!track) { return 0; }
    const firstCard = track.querySelector('.brand-card') as HTMLElement | null;
    if (!firstCard) { return 0; }
    const gap = parseFloat(getComputedStyle(track).columnGap || '0');
    return firstCard.offsetWidth + gap;
  }

  next(): void {
    const track = this.brandsTrack?.nativeElement;
    if (!track) { return; }

    const step = this.getStep();
    const maxScroll = track.scrollWidth - track.clientWidth;

    if (track.scrollLeft + step >= maxScroll - 4) {
      // on est à la fin : on revient au début
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: step, behavior: 'smooth' });
    }
  }

  prev(): void {
    const track = this.brandsTrack?.nativeElement;
    if (!track) { return; }
    track.scrollBy({ left: -this.getStep(), behavior: 'smooth' });
  }

  goToSlide(index: number): void {
    const track = this.brandsTrack?.nativeElement;
    if (!track) { return; }
    track.scrollTo({ left: index * this.getStep(), behavior: 'smooth' });
  }

  onCarouselScroll(): void {
    const track = this.brandsTrack?.nativeElement;
    if (!track) { return; }
    const step = this.getStep();
    if (!step) { return; }
    this.activeSlide = Math.round(track.scrollLeft / step);
  }

  startAutoplay(): void {
    this.stopAutoplay();
    this.autoplayId = setInterval(() => this.next(), this.autoplayDelay);
  }

  stopAutoplay(): void {
    if (this.autoplayId) {
      clearInterval(this.autoplayId);
      this.autoplayId = null;
    }
  }
}