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
	templateUrl: './skeleton-loader.component.html',
	styleUrls: ['./skeleton-loader.component.scss'],
})
export class SkeletonLoaderComponent {
	readonly variant = input<'text' | 'circle' | 'rect' | 'card'>('rect');
	readonly width = input<string>('100%');
	readonly height = input<string>('100%');
}
