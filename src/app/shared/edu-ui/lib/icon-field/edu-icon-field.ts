import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'edu-icon-field',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="edu-icon-field">
			<ng-content></ng-content>
		</div>
	`,
	styleUrl: './edu-icon-field.scss',
})
export class EduIconField {}
