import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef, NgZone, ChangeDetectionStrategy } from '@angular/core';

import { BoltCornersComponent } from '../bolt-corners/bolt-corners';

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
  imports: [BoltCornersComponent],
  templateUrl: './magnetic-carousel.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
  _items: MagneticItem[] = [];
  @Input() set items(val: MagneticItem[]) {
    this._items = val;
    this.setupRepeatedItems();
  }
  get items(): MagneticItem[] { return this._items; }
  
  repeatedItems: MagneticItem[] = [];
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
  
  private autoScrollRef = 0;
  private isHovered = false;
  private isScrolling = false;

  private targetRef: number[] = [];
  private curRef: number[] = [];
  private loopRef = 0;
  private closeTimer: any;

  // Drag state
  private isDragging = false;
  private startX = 0;
  private startScrollLeft = 0;
  private hasDragged = false;

  private boundOnMove = this.onMove.bind(this);
  private boundOnLeave = this.onLeave.bind(this);
  
  private boundDragStart = this.onDragStart.bind(this);
  private boundDragMove = this.onDragMove.bind(this);
  private boundDragEnd = this.onDragEnd.bind(this);

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit() {
    this.setupRepeatedItems();
  }

  setupRepeatedItems() {
    if (!this.items || this.items.length === 0) return;
    // Repeat items 3 times for infinite scroll illusion
    this.repeatedItems = [...this.items, ...this.items, ...this.items];
    
    this.factors = this.repeatedItems.map(() => 0);
    this.targetRef = this.repeatedItems.map(() => 0);
    this.curRef = this.repeatedItems.map(() => 0);
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      const el = this.containerRef.nativeElement;
      
      // Magnetic hover events
      el.addEventListener('mouseenter', () => this.isHovered = true);
      el.addEventListener('mouseleave', () => this.isHovered = false);
      el.addEventListener('mouseleave', this.boundOnLeave);
      
      // Drag & Touch events
      el.addEventListener('mousedown', this.boundDragStart);
      el.addEventListener('touchstart', this.boundDragStart, { passive: true });
      
      el.addEventListener('mousemove', this.boundDragMove);
      el.addEventListener('touchmove', this.boundDragMove, { passive: true });
      
      el.addEventListener('mouseup', this.boundDragEnd);
      el.addEventListener('mouseleave', this.boundDragEnd);
      el.addEventListener('touchend', this.boundDragEnd);
      
      this.startAutoScroll();
    });
  }



  startAutoScroll() {
    const step = () => {
      if (!this.isHovered && this.openIndex === null && !this.isScrolling) {
        const el = this.containerRef.nativeElement;
        el.scrollLeft += 1; // Auto-scroll speed
        
        // Seamless loop: If we reach the 3rd set, jump back to 2nd set
        // Or if we go too far left, jump to 2nd set
        const setWidth = this.items.length * (this.collapsedWidth + this.gap);
        
        if (el.scrollLeft >= setWidth * 2) {
          el.scrollLeft -= setWidth;
        } else if (el.scrollLeft <= 0 && this.hasDragged) { // only snap left if dragging backwards
          el.scrollLeft += setWidth;
        }
      }
      this.autoScrollRef = requestAnimationFrame(step);
    };
    this.autoScrollRef = requestAnimationFrame(step);
  }

  ngOnDestroy() {
    if (this.loopRef && typeof window !== 'undefined') cancelAnimationFrame(this.loopRef);
    if (this.autoScrollRef && typeof window !== 'undefined') cancelAnimationFrame(this.autoScrollRef);
    if (this.closeTimer) clearTimeout(this.closeTimer);
    
    if (this.containerRef?.nativeElement) {
      const el = this.containerRef.nativeElement;
      el.removeEventListener('mouseleave', this.boundOnLeave);
      el.removeEventListener('mousedown', this.boundDragStart);
      el.removeEventListener('touchstart', this.boundDragStart);
      el.removeEventListener('mousemove', this.boundDragMove);
      el.removeEventListener('touchmove', this.boundDragMove);
      el.removeEventListener('mouseup', this.boundDragEnd);
      el.removeEventListener('mouseleave', this.boundDragEnd);
      el.removeEventListener('touchend', this.boundDragEnd);
    }
  }

  onDragStart(e: MouseEvent | TouchEvent) {
    this.isDragging = true;
    this.hasDragged = false;
    this.isScrolling = true;
    
    const el = this.containerRef.nativeElement;
    this.startX = 'touches' in e ? e.touches[0].pageX - el.offsetLeft : (e as MouseEvent).pageX - el.offsetLeft;
    this.startScrollLeft = el.scrollLeft;
  }

  onDragMove(e: MouseEvent | TouchEvent) {
    if (!this.isDragging) {
      if (!('touches' in e)) {
        this.boundOnMove(e as MouseEvent);
      }
      return;
    }

    const el = this.containerRef.nativeElement;
    const x = 'touches' in e ? e.touches[0].pageX - el.offsetLeft : (e as MouseEvent).pageX - el.offsetLeft;
    const walk = (x - this.startX) * 1.5; // Scroll speed multiplier
    
    if (Math.abs(walk) > 5) {
       this.hasDragged = true;
    }
    
    el.scrollLeft = this.startScrollLeft - walk;

    const setWidth = this.items.length * (this.collapsedWidth + this.gap);
    
    // Seamless drag loop
    if (el.scrollLeft >= setWidth * 2) {
      el.scrollLeft -= setWidth;
      this.startScrollLeft -= setWidth;
    } else if (el.scrollLeft <= 0) {
      el.scrollLeft += setWidth;
      this.startScrollLeft += setWidth;
    }
  }

  onDragEnd() {
    this.isDragging = false;
    this.isScrolling = false;
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
    
    this.targetRef = this.repeatedItems.map((_, i) => {
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
    this.targetRef = this.repeatedItems.map(() => 0);
    this.startLoop();
  }

  closeCarousel() {
    this.targetRef = this.repeatedItems.map(() => 0);
    this.curRef = this.repeatedItems.map(() => 0);
    this.factors = this.repeatedItems.map(() => 0);
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
    
    // Prevent click if we were dragging
    if (this.hasDragged) {
      this.hasDragged = false;
      return;
    }

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
