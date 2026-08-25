import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'edu-step-panels',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<div class="edu-step-panels"><ng-content></ng-content></div>`,
	styleUrl: './edu-step-panels.scss',
})
export class EduStepPanels {}
