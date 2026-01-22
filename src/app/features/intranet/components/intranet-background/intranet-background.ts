import {
	Component,
	OnInit,
	signal,
	HostListener,
	AfterViewInit,
	inject,
	PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

interface Circle {
	id: number;
	x: number;
	y: number;
	size: number;
	color: string;
}

@Component({
	selector: 'app-intranet-background',
	imports: [CommonModule],
	templateUrl: './intranet-background.html',
	styleUrl: './intranet-background.scss',
})
export class IntranetBackground implements OnInit, AfterViewInit {
	circles = signal<Circle[]>([]);
	private platformId = inject(PLATFORM_ID);

	private colors = [
		'var(--intranet-accent-color-blue, #253470)',
		'var(--intranet-accent-color-yellow, #ffcc0c)',
		'var(--intranet-accent-color-green, #77a02d)',
	];

	ngOnInit(): void {
		if (isPlatformBrowser(this.platformId)) {
			this.generateCircles();
		}
	}

	ngAfterViewInit(): void {
		if (isPlatformBrowser(this.platformId)) {
			// Regenerate after view init to account for full document height
			setTimeout(() => this.generateCircles(), 100);
		}
	}

	@HostListener('window:resize')
	onResize(): void {
		if (isPlatformBrowser(this.platformId)) {
			this.generateCircles();
		}
	}

	private generateCircles(): void {
		const circles: Circle[] = [];
		const pageWidth = document.documentElement.scrollWidth || window.innerWidth;
		const pageHeight = Math.max(
			document.body.scrollHeight,
			document.documentElement.scrollHeight,
			window.innerHeight,
		);
		const step = 300; // Every 300px
		const probability = 0.75; // 75% chance

		let id = 0;

		// Generate grid of potential circle positions across entire page
		for (let y = 0; y < pageHeight + step; y += step) {
			for (let x = 0; x < pageWidth + step; x += step) {
				// 75% chance of appearing
				if (Math.random() < probability) {
					circles.push({
						id: id++,
						x: x + (Math.random() * step - step / 2), // Random offset within cell
						y: y + (Math.random() * step - step / 2),
						size: this.getRandomSize(),
						color: this.getRandomColor(),
					});
				}
			}
		}

		this.circles.set(circles);
	}

	private getRandomSize(): number {
		// Random size between 80px and 120px
		return 80 + Math.random() * 40;
	}

	private getRandomColor(): string {
		return this.colors[Math.floor(Math.random() * this.colors.length)];
	}

	trackById(index: number, circle: Circle): number {
		return circle.id;
	}
}
