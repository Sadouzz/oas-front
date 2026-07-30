import { Directive, ElementRef, OnDestroy, OnInit, inject, input } from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
  host: { class: 'reveal' },
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  readonly appScrollRevealDelay = input(0);

  ngOnInit(): void {
    const el = this.element.nativeElement;
    const delay = this.appScrollRevealDelay();
    if (delay) el.style.transitionDelay = `${delay}ms`;

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add('is-visible');
        this.observer?.disconnect();
      },
      { threshold: 0.15 },
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
