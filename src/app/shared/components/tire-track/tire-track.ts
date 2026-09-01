import {
  Component,
  Input,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';


let nextUniqueId = 0;

@Component({
  selector: 'app-tire-track',
  standalone: true,
  imports: [],
  templateUrl: './tire-track.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './tire-track.css',
})
export class TireTrackComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() opacity: number = 0.5;
  @Input() variant: 'horizontal' | 'vertical' = 'horizontal';
  @Input() align: 'left' | 'center' | 'right' = 'center';
  @Input() rotation: string = '-1.5deg';
  @Input() mode: 'real' | 'oas' = 'real';

  instanceId: string = `tire_track_${++nextUniqueId}`;
  isVisible: boolean = false;
  hasDrawn: boolean = false;

  private observer?: IntersectionObserver;

  constructor(
    private el: ElementRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Unique ID generation per instance
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.hasDrawn) {
            this.hasDrawn = true;
            this.isVisible = true;
            this.cdr.markForCheck();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
