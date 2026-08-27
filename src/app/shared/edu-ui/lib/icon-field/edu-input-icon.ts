import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'edu-input-icon',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
	host: { class: 'edu-input-icon', '[class]': 'styleClass()' },
})
export class EduInputIcon {
	readonly styleClass = input('');
}
