import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type EduProgressBarMode = 'determinate' | 'indeterminate';

@Component({
	selector: 'edu-progress-bar',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-progress-bar" role="progressbar" [attr.aria-valuenow]="mode() === 'determinate' ? value() : null">
			<div
				class="edu-progress-bar__value"
				[class.edu-progress-bar__value--indeterminate]="mode() === 'indeterminate'"
				[style.width]="mode() === 'determinate' ? valueWidth() : null"
			>
				@if (mode() === 'determinate' && value() > 0) {
					<span class="edu-progress-bar__label">{{ value() }}%</span>
				}
			</div>
		</div>
	`,
	styleUrl: './edu-progress-bar.scss',
})
export class EduProgressBar {
	readonly value = input(0);
	readonly mode = input<EduProgressBarMode>('determinate');

	protected readonly valueWidth = computed(() => `${this.value()}%`);
}
