import {
  Component,
  Input,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoltCornersComponent } from '../bolt-corners/bolt-corners';

@Component({
  selector: 'app-speedometer',
  standalone: true,
  imports: [CommonModule, BoltCornersComponent],
  templateUrl: './speedometer.html',
  styleUrl: './speedometer.css',
})
export class SpeedometerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() value: number = 0;
  @Input() prefix: string = '';
  @Input() suffix: string = '';
  @Input() label: string = '';
  @Input() max: number = 100;
  @Input() unit: string = 'KM/H';

  displayedValue: number = 0;
  needleAngle: number = -120; // Position initiale au repos (-120deg)
  isVisible: boolean = false;
  hasAnimated: boolean = false;

  ticks: { angle: number; isMajor: boolean; label: string; x: number; y: number }[] = [];

  private observer?: IntersectionObserver;
  private animFrameId?: number;

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.generateTicks();
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.hasAnimated) {
            this.startAnimation();
          }
        });
      },
      { threshold: 0.25 }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private generateTicks(): void {
    const numTicks = 11;
    const startAngle = -120;
    const totalSweep = 240;
    const step = totalSweep / (numTicks - 1);
    const radius = 82; // Distance des nombres par rapport au centre

    this.ticks = Array.from({ length: numTicks }, (_, i) => {
      const angle = startAngle + i * step;
      const rad = (angle - 90) * (Math.PI / 180);
      const tickValue = Math.round((i / (numTicks - 1)) * this.max);

      return {
        angle,
        isMajor: i % 2 === 0,
        label: tickValue >= 1000 ? `${Math.round(tickValue / 1000)}k` : `${tickValue}`,
        x: 100 + radius * Math.cos(rad),
        y: 100 + radius * Math.sin(rad),
      };
    });
  }

  private startAnimation(): void {
    this.hasAnimated = true;
    this.isVisible = true;

    // Angle cible de l'aiguille (-120° à +120°)
    const ratio = Math.min(Math.max(this.value / this.max, 0), 1);
    this.needleAngle = -120 + ratio * 240;

    // Animation du chiffre central
    const startTime = performance.now();
    const duration = 1500;

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      this.displayedValue = Math.round(easeProgress * this.value);
      this.cdr.markForCheck();

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(animateCount);
      }
    };

    this.animFrameId = requestAnimationFrame(animateCount);
    this.cdr.markForCheck();
  }

  onMouseEnter(): void {
    if (!this.hasAnimated) return;

    // Instant reset
    this.isVisible = false;
    this.needleAngle = -120;
    this.displayedValue = 0;
    
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.cdr.markForCheck();

    // Small delay to allow DOM to apply non-transitioned reset
    setTimeout(() => {
      this.startAnimation();
    }, 50);
  }

  formatValue(val: number): string {
    return val.toLocaleString('fr-FR');
  }
}
