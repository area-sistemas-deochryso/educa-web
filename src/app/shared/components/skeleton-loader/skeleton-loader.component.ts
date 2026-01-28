import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente presentacional para skeleton screens
 * Optimizado para Lighthouse Speed Index
 */
@Component({
	selector: 'app-skeleton-loader',
	standalone: true,
	imports: [CommonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="skeleton" [class]="variant()" [style.width]="width()" [style.height]="height()">
			<div class="skeleton__shimmer"></div>
		</div>
	`,
	styles: [
		`
			.skeleton {
				position: relative;
				overflow: hidden;
				background: var(--surface-100);
				border-radius: var(--border-radius);

				&--text {
					height: 1rem;
					border-radius: 4px;
				}

				&--circle {
					border-radius: 50%;
				}

				&--rect {
					border-radius: var(--border-radius);
				}

				&--card {
					min-height: 120px;
					border-radius: var(--border-radius);
				}
			}

			.skeleton__shimmer {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: linear-gradient(
					90deg,
					transparent 0%,
					var(--surface-200) 50%,
					transparent 100%
				);
				animation: shimmer 1.5s infinite;
				will-change: transform;
			}

			@keyframes shimmer {
				0% {
					transform: translateX(-100%);
				}
				100% {
					transform: translateX(100%);
				}
			}
		`,
	],
})
export class SkeletonLoaderComponent {
	readonly variant = input<'text' | 'circle' | 'rect' | 'card'>('rect');
	readonly width = input<string>('100%');
	readonly height = input<string>('100%');
}
