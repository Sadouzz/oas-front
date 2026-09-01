import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, NgZone } from '@angular/core';

import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BoltCornersComponent } from '../bolt-corners/bolt-corners';


gsap.registerPlugin(ScrollTrigger);

export interface RealisationItem {
  id: string;
  title: string;
  subtitle: string;
  number: string;
  image: string;
  color?: string;
  date: string;
  link: string;
  description: string;
}

@Component({
  selector: 'app-horizontal-gallery',
  standalone: true,
  imports: [RouterLink, BoltCornersComponent],
  templateUrl: './horizontal-gallery.html',
  styles: []
})
export class HorizontalGalleryComponent implements AfterViewInit, OnDestroy {
  @Input() items: RealisationItem[] = [];
  @Input() title = 'Nos réalisations';
  @Input() subtitle = 'En Vedette';
  @Input() description = '';

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollContainer') scrollContainerRef!: ElementRef<HTMLDivElement>;

  private mm = gsap.matchMedia();

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.mm.add("(min-width: 768px)", () => {
        const scrollContainer = this.scrollContainerRef.nativeElement;
        const container = this.containerRef.nativeElement;

        // Pinning and horizontal scroll logic
        const getScrollAmount = () => {
          let amount = scrollContainer.scrollWidth - window.innerWidth;
          return amount > 0 ? -amount : 0;
        };

        const tween = gsap.to(scrollContainer, {
          x: getScrollAmount,
          ease: "none",
          scrollTrigger: {
            trigger: container,
            pin: true,
            start: "top top",
            end: () => `+=${Math.abs(getScrollAmount())}`,
            scrub: 0.5,
            invalidateOnRefresh: true,
          }
        });

        // Skew effect based on scroll velocity
        const proxy = { skew: 0 };
        const skewSetter = gsap.quickSetter('.gallery-skew-target', 'skewX', 'deg');
        const clamp = gsap.utils.clamp(-20, 20); // Clamp to avoid excessive skew

        ScrollTrigger.create({
          onUpdate: (self) => {
            const velocity = clamp(self.getVelocity() / -300);
            if (Math.abs(velocity) > 0.5) {
              proxy.skew = velocity;
              gsap.to(proxy, {
                skew: 0,
                duration: 0.8,
                ease: "power3",
                overwrite: true,
                onUpdate: () => skewSetter(proxy.skew)
              });
            }
          }
        });

        ScrollTrigger.refresh();

        return () => {
          tween.kill();
        };
      });
      }, 500); // Increased timeout to ensure DOM and images are ready
    });
  }

  ngOnDestroy() {
    this.mm.revert();
  }
}
