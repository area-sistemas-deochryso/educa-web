import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-counter-section',
  standalone: true,
  imports: [],
  templateUrl: './counter-section.html',
  styleUrl: './counter-section.scss',
})
export class CounterSectionComponent implements OnInit, AfterViewInit, OnDestroy {
  targetCount = 500;
  displayedCount = 0;
  private animationFrameId: number | null = null;
  private observer: IntersectionObserver | null = null;
  private hasAnimated = false;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver(): void {
    const element = document.querySelector('.counter-thumb');
    if (!element) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.hasAnimated) {
            this.hasAnimated = true;
            this.animateCounter();
          }
        });
      },
      { threshold: 0.5 }
    );

    this.observer.observe(element);
  }

  private animateCounter(): void {
    const duration = 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      this.displayedCount = Math.floor(progress * this.targetCount);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.displayedCount = this.targetCount;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }
}
