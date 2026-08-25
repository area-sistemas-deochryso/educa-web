import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'edu-step-list',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<div class="edu-step-list" role="tablist"><ng-content></ng-content></div>`,
	styleUrl: './edu-step-list.scss',
})
export class EduStepList {}
