import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-jerrycan',
  standalone: true,
  imports: [],
  templateUrl: './jerrycan.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './jerrycan.css',
})
export class JerrycanComponent implements OnInit, OnDestroy {
  @Input() opacity = 0.08;
  @Input() size = 300;

  tiltAngle = 0;
  private lastScrollY = 0;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.lastScrollY = window.scrollY;
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  private onScroll = (): void => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - this.lastScrollY;
    this.lastScrollY = currentScrollY;

    // Le bidon s'incline légèrement selon la direction du scroll
    // On limite l'inclinaison entre -25 et +25 degrés
    this.tiltAngle = Math.min(Math.max(this.tiltAngle + delta * 0.1, -25), 25);
    
    // Retour progressif vers 0 quand on s'arrête de scroller
    // (géré par un amortissement simple)
    this.tiltAngle *= 0.92;

    this.cdr.markForCheck();
  };

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.onScroll);
    }
  }
}
