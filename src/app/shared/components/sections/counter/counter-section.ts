import {
	Component,
	OnDestroy,
	AfterViewInit,
	ChangeDetectorRef,
	inject,
	PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
	selector: 'app-counter-section',
	standalone: true,
	imports: [],
	templateUrl: './counter-section.html',
	styleUrl: './counter-section.scss',
})
export class CounterSectionComponent implements AfterViewInit, OnDestroy {
	// * Detect changes during animation updates.
	private cdr = inject(ChangeDetectorRef);
	private platformId = inject(PLATFORM_ID);

	// * Counter target + displayed state.
	targetCount = 500;
	displayedCount = 0;
	private animationFrameId: number | null = null;
	private observer: IntersectionObserver | null = null;
	private hasAnimated = false;

	ngAfterViewInit(): void {
		// * Only run observers in the browser.
		if (isPlatformBrowser(this.platformId)) {
			this.setupIntersectionObserver();
		}
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
		// * Start animation when counter enters viewport.
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
			{ threshold: 0.5 },
		);

		this.observer.observe(element);
	}

	private animateCounter(): void {
		const duration = 2000;
		const startTime = performance.now();

		const easeOutQuad = (t: number): number => t * (2 - t);

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easedProgress = easeOutQuad(progress);

			this.displayedCount = Math.floor(easedProgress * this.targetCount);
			this.cdr.detectChanges();

			if (progress < 1) {
				this.animationFrameId = requestAnimationFrame(animate);
			} else {
				this.displayedCount = this.targetCount;
				this.cdr.detectChanges();
			}
		};

		this.animationFrameId = requestAnimationFrame(animate);
	}
}
