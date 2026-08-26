import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type EduSkeletonShape = 'rectangle' | 'circle';

@Component({
	selector: 'edu-skeleton',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<div class="edu-skeleton" [class.edu-skeleton--circle]="shape() === 'circle'" [class]="styleClass()" [style]="sizeStyle()"></div>`,
	styleUrl: './edu-skeleton.scss',
})
export class EduSkeleton {
	readonly width = input<string>('100%');
	readonly height = input<string>('1rem');
	readonly shape = input<EduSkeletonShape>('rectangle');
	readonly styleClass = input('');

	protected readonly sizeStyle = computed(() => ({ width: this.width(), height: this.height() }));
}
