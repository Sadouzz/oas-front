import {
  Component,
  OnInit,
  OnDestroy,
  NgZone,
  ElementRef,
  ViewChild,
  AfterViewInit,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-wrench-cursor',
  standalone: true,
  imports: [],
  templateUrl: './wrench-cursor.html',
  styleUrl: './wrench-cursor.css',
})
export class WrenchCursorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cursorEl') cursorEl!: ElementRef<HTMLDivElement>;

  private x = -200;
  private y = -200;
  private rotation = -20;

  private prevX = 0;
  private targetX = -200;
  private targetY = -200;
  private targetRotation = -20;
  private rafId: number | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('mousemove', this.onMouseMove, { passive: true });
      document.addEventListener('mouseleave', this.onMouseLeave, { passive: true });
      this.startRaf();
    });
  }

  private onMouseMove = (e: MouseEvent): void => {
    const dx = e.clientX - this.prevX;

    if (Math.abs(dx) > 1) {
      this.targetRotation = dx > 0 ? 10 : -55;
    } else {
      this.targetRotation = -20;
    }

    this.prevX = e.clientX;
    this.targetX = e.clientX;
    this.targetY = e.clientY;
  };

  private onMouseLeave = (): void => {
    this.targetX = -500;
    this.targetY = -500;
  };

  private startRaf(): void {
    const loop = () => {
      // Lerp position
      this.x += (this.targetX - this.x) * 0.15;
      this.y += (this.targetY - this.y) * 0.15;
      // Lerp rotation
      this.rotation += (this.targetRotation - this.rotation) * 0.12;

      // Manipulation DOM directe — pas de Angular CD
      const el = this.cursorEl?.nativeElement;
      if (el) {
        el.style.transform = `translate(${this.x}px, ${this.y}px) rotate(${this.rotation}deg)`;
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseleave', this.onMouseLeave);
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }
}
