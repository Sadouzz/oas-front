import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SERVICES, Service } from './services.data';
import { ScrollRevealDirective } from '../shared/scroll-reveal.directive';

import { SectionTitle } from '../../shared/components/section-title/section-title';
import { EnginePistonsComponent } from '../../shared/components/engine-pistons/engine-pistons';
import { DashboardWarningsComponent } from '../../shared/components/dashboard-warnings/dashboard-warnings';
import { TireTrackComponent } from '../../shared/components/tire-track/tire-track';
import { MechanicalGearsComponent } from '../../shared/components/mechanical-gears/mechanical-gears';
import { BoltCornersComponent } from '../../shared/components/bolt-corners/bolt-corners';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ScrollRevealDirective,
    SectionTitle,
    EnginePistonsComponent,
    DashboardWarningsComponent,
    TireTrackComponent,
    MechanicalGearsComponent,
    BoltCornersComponent
  ],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services implements AfterViewInit, OnDestroy {
  private static readonly WHEEL_ANGLE_STEP = Math.PI / 2;
  private static readonly WHEEL_RADIUS_X = 260;
  private static readonly WHEEL_RADIUS_Y = 220;
  private static readonly WHEEL_CENTER_Y = 250;

  @ViewChild('journey') journey?: ElementRef<HTMLElement>;

  readonly services = SERVICES;
  activeIndex = 0;
  wheelRotation = 0;

  processSteps = [
    { step: '01', title: 'Vous nous expliquez votre besoin', desc: 'Par téléphone, en ligne ou directement à l’atelier.' },
    { step: '02', title: 'Nous réalisons le contrôle', desc: 'Un diagnostic précis pour comprendre la situation.' },
    { step: '03', title: 'Vous recevez un devis clair', desc: 'Nous expliquons l’intervention avant toute décision.' },
    { step: '04', title: 'Nous intervenons après validation', desc: 'Votre véhicule est contrôlé avant sa restitution.' }
  ];

  trustPoints = [
    { step: '01', title: 'Des explications claires', desc: 'Vous savez ce qui est fait sur votre véhicule.' },
    { step: '02', title: 'Des pièces adaptées', desc: 'Des solutions pensées pour votre sécurité et votre budget.' },
    { step: '03', title: 'Un suivi personnalisé', desc: 'Une équipe disponible à chaque étape.' }
  ];

  private resizeObserver?: ResizeObserver;
  private scrollFrameRequested = false;

  get activeService(): Service {
    return this.services[this.activeIndex];
  }

  ngAfterViewInit(): void {
    const journeyElement = this.journey?.nativeElement;
    if (!journeyElement) return;

    window.addEventListener('scroll', this.onJourneyScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(() => this.updateActiveService());
    this.resizeObserver.observe(journeyElement);
    this.updateActiveService();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onJourneyScroll);
    this.resizeObserver?.disconnect();
  }

  private readonly onJourneyScroll = (): void => {
    if (this.scrollFrameRequested) return;

    this.scrollFrameRequested = true;
    requestAnimationFrame(() => {
      this.updateActiveService();
      this.scrollFrameRequested = false;
    });
  };

  onWarningSelected(event: { slug: string; index: number }): void {
    this.selectService(event.index);
  }

  selectService(index: number): void {
    this.activeIndex = index;

    if (window.innerWidth < 900) {
      const mobileItems = document.querySelectorAll('.mobile-service-list a');
      if (mobileItems && mobileItems[index]) {
        mobileItems[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const mobileSection = document.querySelector('.mobile-services');
        mobileSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    const journeyElement = this.journey?.nativeElement;
    if (!journeyElement) return;

    const rect = journeyElement.getBoundingClientRect();
    const absoluteTop = window.scrollY + rect.top;

    const targetScroll = absoluteTop + (index * window.innerHeight);
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }

  bubbleX(index: number): number {
    return Services.WHEEL_RADIUS_X * Math.cos(this.bubbleAngle(index));
  }

  bubbleY(index: number): number {
    return Services.WHEEL_CENTER_Y + Services.WHEEL_RADIUS_Y * Math.sin(this.bubbleAngle(index));
  }

  bubbleOpacity(index: number): number {
    const distance = Math.abs(index - this.activeIndex);
    if (distance === 0) return 1;
    if (distance === 1) return 0.72;
    return 0;
  }

  isBubbleVisible(index: number): boolean {
    return Math.abs(index - this.activeIndex) <= 1;
  }

  private bubbleAngle(index: number): number {
    const offset = index - this.activeIndex;
    const parkedOffset = Math.max(-2, Math.min(2, offset));
    return parkedOffset * Services.WHEEL_ANGLE_STEP;
  }

  private updateActiveService(): void {
    const journeyElement = this.journey?.nativeElement;
    if (!journeyElement) return;

    const rect = journeyElement.getBoundingClientRect();
    const scrolled = -rect.top;

    const scrollableDistance = Math.max(rect.height - window.innerHeight, 1);

    const progress = Math.min(1, Math.max(0, scrolled / scrollableDistance));
    this.wheelRotation = -Math.round(progress * 720); // -720 degrees full rotation

    if (window.innerWidth < 900) return;

    const nextIndex = Math.min(this.services.length - 1, Math.round(progress * (this.services.length - 1)));

    if (nextIndex !== this.activeIndex) this.activeIndex = nextIndex;
  }
}
