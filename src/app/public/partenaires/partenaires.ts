import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { register } from 'swiper/element/bundle';

import { PartenaireService, PartenaireModel } from '../../services/partenaire.service';
import { FournisseurService, FournisseurModel } from '../../services/fournisseur.service';

import { IconComponent } from '../../shared/icon/icon';
import { SectionTitle } from '../../shared/components/section-title/section-title';
import { TireTrackComponent } from '../../shared/components/tire-track/tire-track';
import { SheetMetalCardComponent } from '../../shared/components/sheet-metal-card/sheet-metal-card';
import { BoltCornersComponent } from '../../shared/components/bolt-corners/bolt-corners';
import { JerrycanComponent } from '../../shared/components/jerrycan/jerrycan';

register();

@Component({
  selector: 'app-partenaires',
  standalone: true,
  imports: [
    RouterModule,
    IconComponent,
    SectionTitle,
    TireTrackComponent,
    SheetMetalCardComponent,
    BoltCornersComponent,
    JerrycanComponent
],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './partenaires.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./partenaires.css']
})
export class Partenaires implements OnInit, AfterViewInit, OnDestroy {

  partenairesLocaux: PartenaireModel[] = [];
  partenairesExterieurs: PartenaireModel[] = [];
  fournisseurs: FournisseurModel[] = [];

  constructor(
    private partenaireService: PartenaireService,
    private fournisseurService: FournisseurService
  ) {}

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
    this.partenaireService.getAll().subscribe(data => {
      this.partenairesLocaux = data.filter(p => p.type === 'LOCAL' && !p.archived);
      this.partenairesExterieurs = data.filter(p => p.type === 'EXTERIEUR' && !p.archived);
    });

    this.fournisseurService.getAll().subscribe(data => {
      this.fournisseurs = data.filter(f => !f.archived);
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