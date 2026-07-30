import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MagneticItem } from '../magnetic-carousel/magnetic-carousel';
import { SectionTitle } from '../section-title/section-title';

@Component({
  selector: 'app-interactive-services-list',
  standalone: true,
  imports: [CommonModule, RouterLink, SectionTitle],
  templateUrl: './interactive-services-list.html',
})
export class InteractiveServicesListComponent implements AfterViewInit, OnDestroy {
  @Input() items: MagneticItem[] = [];
  
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  hoveredIndex: number | null = null;
  anyActive = false;
  
  cursorX = 0;
  cursorY = 0;
  
  private targetX = 0;
  private targetY = 0;
  
  private rafRef: any;

  constructor(private cdr: ChangeDetectorRef, private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.startLoop();
  }

  ngOnDestroy() {
    if (this.rafRef && typeof window !== 'undefined') {
      cancelAnimationFrame(this.rafRef);
    }
  }
  
  startLoop() {
    const step = () => {
      let dx = this.targetX - this.cursorX;
      let dy = this.targetY - this.cursorY;
      
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
          this.cursorX += dx * 0.15;
          this.cursorY += dy * 0.15;
          this.cdr.detectChanges();
      }
      
      this.rafRef = requestAnimationFrame(step);
    };
    this.ngZone.runOutsideAngular(() => {
        this.rafRef = requestAnimationFrame(step);
    });
  }

  onMove(e: MouseEvent) {
    if (!this.containerRef) return;
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    
    // Offset X slightly so it sits next to the cursor, not under it
    this.targetX = e.clientX - rect.left + 200; 
    this.targetY = e.clientY - rect.top;
    
    if (!this.anyActive) {
        this.cursorX = this.targetX;
        this.cursorY = this.targetY;
    }
  }

  onHover(index: number) {
    this.hoveredIndex = index;
    this.anyActive = true;
  }

  onLeaveContainer() {
    this.hoveredIndex = null;
    this.anyActive = false;
  }
}
