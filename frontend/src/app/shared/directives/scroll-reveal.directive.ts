import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() delay = 0;
  @Input() direction: 'up' | 'left' | 'right' = 'up';
  @Input() repeat = false;

  private observer!: IntersectionObserver;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    const el = this.el.nativeElement;
    el.classList.add('scroll-reveal');
    if (this.direction === 'left')  el.classList.add('from-left');
    if (this.direction === 'right') el.classList.add('from-right');
    el.style.transitionDelay = `${this.delay}ms`;

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          if (!this.repeat) this.observer.disconnect();
        } else if (this.repeat) {
          el.classList.remove('is-visible');
        }
      },
      { threshold: 0.15 },
    );

    // Double rAF ensures the browser paints the element in its initial hidden
    // state before the observer fires — otherwise elements already in the
    // viewport on navigation skip the CSS transition and appear instantly.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.observer.observe(el);
      });
    });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
