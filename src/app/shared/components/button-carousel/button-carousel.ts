import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MagneticItem } from '../magnetic-carousel/magnetic-carousel';
import { SectionTitle } from '../section-title/section-title';

function modIdx(i: number, n: number) {
    return ((i % n) + n) % n;
}

function easeCubicInOut(p: number) {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

@Component({
  selector: 'app-button-carousel',
  standalone: true,
  imports: [CommonModule, SectionTitle],
  templateUrl: './button-carousel.html',
})
export class ButtonCarouselComponent implements OnInit, OnDestroy {
  @Input() items: MagneticItem[] = [];
  @Input() backgroundColor = '#ffffff';
  
  imageWidth = 400;
  imageHeight = 400;
  buttonCount = 7;
  buttonSize = 60;
  buttonRadius = 30;
  curve = 5;
  gap = 26;

  posRef = 0;
  posDisplay = 0;
  dir = 1;
  active = 0;
  
  private rafRef: any = null;
  private animRef = { startPos: 0, targetPos: 0, startTime: 0 };
  private autoPlayInterval: any = null;
  
  renderItems: number[] = [];

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngOnInit() {
    this.updateRenderItems();
    this.startAutoPlay();
  }

  ngOnDestroy() {
    if (this.rafRef && typeof window !== 'undefined') {
      cancelAnimationFrame(this.rafRef);
    }
    this.stopAutoPlay();
  }

  startAutoPlay() {
    if (typeof window !== 'undefined') {
      this.autoPlayInterval = setInterval(() => {
        this.next();
      }, 5000);
    }
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  resetAutoPlay() {
    this.stopAutoPlay();
    this.startAutoPlay();
  }

  next() {
    this.select(modIdx(this.active + 1, this.M));
  }

  get M() {
    return this.items.length;
  }

  updateRenderItems() {
    const M = this.M;
    const center = Math.round(this.posDisplay);
    const half = Math.floor(Math.min(Math.max(1, this.buttonCount), M) / 2);
    const buffer = half + 1;
    
    this.renderItems = [];
    const seen = new Set<number>();
    for (let s = -buffer; s <= buffer; s++) {
      const idx = modIdx(center + s, M);
      if (!seen.has(idx)) {
        seen.add(idx);
        this.renderItems.push(idx);
      }
    }
    this.active = modIdx(Math.round(this.posDisplay), M);
  }

  select(itemIdx: number) {
    if (this.active === itemIdx) return;
    
    // Reset the auto-play timer when user interacts manually
    this.resetAutoPlay();

    const M = this.M;
    const currentActive = modIdx(Math.round(this.posRef), M);

    let delta = itemIdx - currentActive;
    delta = ((delta % M) + M) % M;
    if (delta > M / 2) delta -= M;
    this.dir = Math.sign(delta);

    if (this.rafRef && typeof window !== 'undefined') cancelAnimationFrame(this.rafRef);

    this.animRef = {
      startPos: this.posRef,
      targetPos: this.posRef + delta,
      startTime: performance.now(),
    };

    const DURATION = 320;
    const tick = (now: number) => {
      const { startPos, targetPos, startTime } = this.animRef;
      const progress = Math.min(1, (now - startTime) / DURATION);
      this.posRef = startPos + (targetPos - startPos) * easeCubicInOut(progress);
      this.posDisplay = this.posRef;
      
      this.updateRenderItems();
      this.cdr.detectChanges();
      
      if (progress < 1) {
        this.rafRef = requestAnimationFrame(tick);
      } else {
        this.posRef = targetPos;
        this.posDisplay = targetPos;
        this.updateRenderItems();
        this.cdr.detectChanges();
        this.rafRef = null;
      }
    };
    
    this.ngZone.runOutsideAngular(() => {
      this.rafRef = requestAnimationFrame(tick);
    });
  }

  getVisualSlot(itemIdx: number): number {
    const M = this.M;
    let slot = itemIdx - this.posDisplay;
    
    // Wrap the distance around the circle to take the shortest path visually
    // Since posDisplay is continuous, we need to handle wrapping properly
    // This part matches the visual location on the strip
    const rawDelta = itemIdx - this.posDisplay;
    let shortest = rawDelta;
    
    if (rawDelta > M / 2) shortest -= M;
    if (rawDelta < -M / 2) shortest += M;
    
    return shortest;
  }

  slotStyle(slot: number) {
    const M = this.M;
    const half = Math.floor(Math.min(Math.max(1, this.buttonCount), M) / 2);
    
    // Smooth angle mapping
    const maxTheta = 60; // degrees
    const dPsi = maxTheta / half;
    const angle = slot * dPsi;
    
    // Scale and opacity falloff
    const absSlot = Math.abs(slot);
    let scale = 1;
    let opacity = 1;
    if (absSlot > 0) {
      scale = Math.pow(0.85, absSlot);
      opacity = Math.max(0, 1 - (absSlot * 0.2));
    }

    // Convert polar to cartesian (creating a circular arc)
    const R = this.buttonSize * 2.5; 
    const theta = angle * (Math.PI / 180);
    const x = Math.sin(theta) * R;
    const y = R - Math.cos(theta) * R;
    
    // Add vertical offset to create depth curve
    const depthY = absSlot * this.curve;
    
    return {
      x,
      y: y + depthY,
      scale,
      opacity,
      deg: angle,
      zIndex: 100 - absSlot
    };
  }

  get stripHeight() {
    return this.buttonSize + (this.buttonCount * this.curve) + 40;
  }
}
