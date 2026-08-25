import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'edu-card',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-card">
			<ng-content></ng-content>
		</div>
	`,
	styles: `
		.edu-card {
			padding: 1.25rem;
			border-radius: var(--eduui-radius-xl);
			background: var(--eduui-content-background);
			color: var(--eduui-content-color);
			box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
		}
	`,
})
export class EduCard {}
