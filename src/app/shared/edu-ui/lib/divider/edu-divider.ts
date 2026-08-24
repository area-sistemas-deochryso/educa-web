import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type EduDividerLayout = 'horizontal' | 'vertical';

@Component({
	selector: 'edu-divider',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-divider" [class.edu-divider--vertical]="layout() === 'vertical'" role="separator">
			<ng-content></ng-content>
		</div>
	`,
	styleUrl: './edu-divider.scss',
})
export class EduDivider {
	readonly layout = input<EduDividerLayout>('horizontal');
}
