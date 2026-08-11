import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  NgZone,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-oil-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oil-gauge.html',
  styleUrl: './oil-gauge.css',
})
export class OilGaugeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('oilFillEl') oilFillEl!: ElementRef<HTMLDivElement>;

  private targetPercent = 0;
  private currentPercent = 0;
  private rafId: number | null = null;
  private scrollProgress = 0;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.startRaf();
    });
  }

  private onScroll = (): void => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollProgress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
    // L'huile monte quand on descend la page (ou descend, faisons-la monter de MIN à MAX)
    this.targetPercent = this.scrollProgress * 100;
  };

  private startRaf(): void {
    const loop = () => {
      // Lerp fluide pour une animation de fluide d'huile réaliste
      this.currentPercent += (this.targetPercent - this.currentPercent) * 0.1;
      
      const oilFill = this.oilFillEl?.nativeElement;
      if (oilFill) {
        // Mettre à jour la hauteur du liquide dans la jauge
        oilFill.style.height = `${this.currentPercent}%`;
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.removeEventListener('scroll', this.onScroll);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }
}
