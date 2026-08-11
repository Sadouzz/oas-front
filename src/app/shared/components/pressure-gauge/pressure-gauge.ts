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
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-pressure-gauge',
  standalone: true,
  imports: [],
  templateUrl: './pressure-gauge.html',
  styleUrl: './pressure-gauge.css',
})
export class PressureGaugeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('needleEl') needleEl!: ElementRef<SVGElement>;
  @ViewChild('glowEl')   glowEl!:   ElementRef<SVGCircleElement>;
  @ViewChild('labelEl')  labelEl!:  ElementRef<SVGTextElement>;
  @ViewChild('arcFillEl') arcFillEl!: ElementRef<SVGPathElement>;

  // Angle de l'aiguille : -120° (min) → +120° (max)
  private readonly MIN_ANGLE = -120;
  private readonly MAX_ANGLE =  120;

  private targetAngle = this.MIN_ANGLE;
  private currentAngle = this.MIN_ANGLE;
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
    this.targetAngle = this.MIN_ANGLE + this.scrollProgress * (this.MAX_ANGLE - this.MIN_ANGLE);
  };

  private startRaf(): void {
    // Cx, Cy du centre de l'aiguille dans le SVG (viewBox 0 0 130 115)
    const CX = 65;
    const CY = 72;

    // Calcule le path de l'arc de remplissage
    const describeArc = (progress: number): string => {
      const r = 46;
      const startAngleDeg = -120;
      const endAngleDeg   = startAngleDeg + progress * 240;

      const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
      const sx = CX + r * Math.cos(toRad(startAngleDeg));
      const sy = CY + r * Math.sin(toRad(startAngleDeg));
      const ex = CX + r * Math.cos(toRad(endAngleDeg));
      const ey = CY + r * Math.sin(toRad(endAngleDeg));
      const largeArc = progress > 0.5 ? 1 : 0;
      if (progress <= 0) return `M ${sx} ${sy}`;
      return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
    };

    const loop = () => {
      // Lerp fluide de l'angle
      this.currentAngle += (this.targetAngle - this.currentAngle) * 0.08;
      const progress = (this.currentAngle - this.MIN_ANGLE) / (this.MAX_ANGLE - this.MIN_ANGLE);

      // Rotation de l'aiguille autour de son pivot (cx, cy)
      const needle = this.needleEl?.nativeElement;
      if (needle) {
        needle.setAttribute('transform', `rotate(${this.currentAngle}, ${CX}, ${CY})`);
      }

      // Arc de progression coloré
      const arcFill = this.arcFillEl?.nativeElement;
      if (arcFill) {
        arcFill.setAttribute('d', describeArc(progress));
      }

      // Couleur glow : vert → orange → rouge selon la progression
      const glow = this.glowEl?.nativeElement;
      if (glow) {
        const r = Math.round(20 + progress * 215);
        const g = Math.round(200 - progress * 200);
        glow.setAttribute('fill', `rgb(${r}, ${g}, 20)`);
        glow.setAttribute('opacity', `${0.12 + progress * 0.25}`);
      }

      // Label de pourcentage
      const label = this.labelEl?.nativeElement;
      if (label) {
        label.textContent = `${Math.round(progress * 100)}`;
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
