import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MagneticItem {
  id: number | string;
  src: string;
  title?: string;
  slug?: string;
  description?: string;
}

@Component({
  selector: 'app-magnetic-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './magnetic-carousel.html',
  styles: [`
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class MagneticCarouselComponent implements AfterViewInit, OnDestroy {
  @Input() items: MagneticItem[] = [];
  @Input() collapsedWidth = 100;
  @Input() hoverWidth = 200;
  @Input() collapsedHeight = 340;
  @Input() hoverHeight = 400;
  @Input() openSize = 600;
  @Input() gap = 16;
  @Input() influence = 200;
  @Input() blurAmount = 2;
  @Input() dur = 0.3;
  @Input() ease = 'ease-in-out';

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  factors: number[] = [];
  openIndex: number | null = null;
  closing = false;

  private targetRef: number[] = [];
  private curRef: number[] = [];
  private loopRef = 0;
  private closeTimer: any;

  private boundOnMove = this.onMove.bind(this);
  private boundOnLeave = this.onLeave.bind(this);

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit() {
    this.factors = this.items.map(() => 0);
    this.targetRef = this.items.map(() => 0);
    this.curRef = this.items.map(() => 0);
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      const el = this.containerRef.nativeElement;
      el.addEventListener('mousemove', this.boundOnMove);
      el.addEventListener('mouseleave', this.boundOnLeave);
    });
  }

  ngOnDestroy() {
    if (this.loopRef && typeof window !== 'undefined') cancelAnimationFrame(this.loopRef);
    if (this.closeTimer) clearTimeout(this.closeTimer);
    
    if (this.containerRef?.nativeElement) {
      const el = this.containerRef.nativeElement;
      el.removeEventListener('mousemove', this.boundOnMove);
      el.removeEventListener('mouseleave', this.boundOnLeave);
    }
  }

  startLoop() {
    if (this.loopRef) return;
    const step = () => {
      const tgt = this.targetRef;
      const cur = this.curRef;
      let moving = false;
      for (let i = 0; i < cur.length; i++) {
        const d = (tgt[i] ?? 0) - cur[i];
        if (Math.abs(d) > 0.001) {
          cur[i] += d * 0.2; // lerp toward target
          moving = true;
        } else {
          cur[i] = tgt[i] ?? 0;
        }
      }
      this.factors = [...cur];
      this.cdr.detectChanges();
      
      this.loopRef = moving ? requestAnimationFrame(step) : 0;
    };
    
    this.ngZone.runOutsideAngular(() => {
      this.loopRef = requestAnimationFrame(step);
    });
  }

  setTargetFromCursor(clientX: number) {
    const el = this.containerRef.nativeElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = clientX - rect.left + el.scrollLeft;
    
    // Start offset relies on padding-left of container (px-12 = 48px)
    const startX = 48;
    
    this.targetRef = this.items.map((_, i) => {
      const center = startX + i * (this.collapsedWidth + this.gap) + this.collapsedWidth / 2;
      const dist = Math.abs(cx - center);
      const f = Math.max(0, 1 - dist / this.influence);
      return f * f * (3 - 2 * f); // smoothstep falloff
    });
    this.startLoop();
  }

  onMove(e: MouseEvent) {
    if (this.openIndex !== null) return;
    this.setTargetFromCursor(e.clientX);
  }

  onLeave() {
    if (this.openIndex !== null) return;
    this.targetRef = this.items.map(() => 0);
    this.startLoop();
  }

  closeCarousel() {
    this.targetRef = this.items.map(() => 0);
    this.curRef = this.items.map(() => 0);
    this.factors = this.items.map(() => 0);
    this.closing = true;
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closing = false;
      this.cdr.detectChanges();
    }, this.dur * 1000);
    this.openIndex = null;
    this.cdr.detectChanges();
  }

  onItemClick(e: MouseEvent, index: number) {
    e.stopPropagation();
    if (this.openIndex === index) {
      this.closeCarousel();
    } else {
      this.openIndex = index;
      
      // Auto-scroll to the clicked item if it's partially out of view
      const el = this.containerRef.nativeElement;
      const startX = 48;
      const center = startX + index * (this.collapsedWidth + this.gap) + this.collapsedWidth / 2;
      const scrollTarget = center - el.clientWidth / 2;
      el.scrollTo({ left: scrollTarget, behavior: 'smooth' });

      this.cdr.detectChanges();
    }
  }

  sizeFor(i: number) {
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    const actualOpenSize = isMobile ? window.innerWidth - 64 : this.openSize;
    const actualHoverWidth = isMobile ? this.collapsedWidth : this.hoverWidth;
    const actualHoverHeight = isMobile ? this.collapsedHeight : this.hoverHeight;

    if (this.openIndex !== null) {
      return i === this.openIndex
        ? { width: actualOpenSize, height: actualOpenSize }
        : { width: this.collapsedWidth, height: this.collapsedHeight };
    }
    const f = this.factors[i] ?? 0;
    return {
      width: this.collapsedWidth + (actualHoverWidth - this.collapsedWidth) * f,
      height: this.collapsedHeight + (actualHoverHeight - this.collapsedHeight) * f,
    };
  }

  getTransitionStyle() {
    const openEase = `width ${this.dur}s cubic-bezier(0.44, 0, 0.56, 1), height ${this.dur}s cubic-bezier(0.44, 0, 0.56, 1), filter ${this.dur}s cubic-bezier(0.44, 0, 0.56, 1), opacity ${this.dur}s cubic-bezier(0.44, 0, 0.56, 1)`;
    return this.openIndex !== null || this.closing ? openEase : 'none';
  }
}
