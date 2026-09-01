import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';


@Component({
  selector: 'app-mechanical-gears',
  standalone: true,
  imports: [],
  templateUrl: './mechanical-gears.html',
  styleUrl: './mechanical-gears.css',
})
export class MechanicalGearsComponent implements OnInit, OnDestroy {
  @Input() opacity: number = 0.08;
  @Input() size: number = 600;

  scrollAngle: number = 0;
  private lastScrollY: number = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.lastScrollY = window.scrollY;
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  private onScroll = (): void => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - this.lastScrollY;
    this.lastScrollY = currentScrollY;

    // Accélération fluide proportionnelle au défilement
    this.scrollAngle += delta * 0.45;
    this.cdr.markForCheck();
  };

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.onScroll);
    }
  }
}
