import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'edu-spinner',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<svg class="edu-spinner" viewBox="25 25 50 50">
			<circle class="edu-spinner__circle" cx="50" cy="50" r="20" fill="none" stroke-width="2" stroke-miterlimit="10" />
		</svg>
	`,
	styleUrl: './edu-spinner.scss',
})
export class EduSpinner {}
