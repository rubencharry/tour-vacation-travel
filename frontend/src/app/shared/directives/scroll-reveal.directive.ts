import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() delay = 0;

  private observer!: IntersectionObserver;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    const el = this.el.nativeElement;
    el.classList.add('scroll-reveal');
    el.style.transitionDelay = `${this.delay}ms`;

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          this.observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    this.observer.observe(el);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
