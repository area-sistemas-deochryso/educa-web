import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'edu-input-icon',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
	host: { class: 'edu-input-icon' },
})
export class EduInputIcon {}
