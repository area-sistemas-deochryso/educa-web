import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { EduStepperService, EduStepValue } from './edu-stepper.service';

@Component({
	selector: 'edu-stepper',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [EduStepperService],
	template: `<div class="edu-stepper"><ng-content></ng-content></div>`,
	styleUrl: './edu-stepper.scss',
})
export class EduStepper {
	readonly value = input<EduStepValue>();
	readonly valueChange = output<EduStepValue>();

	private readonly service = inject(EduStepperService);

	constructor() {
		effect(() => {
			const v = this.value();
			if (v !== undefined) {
				this.service.active.set(v);
			}
		});
		this.service.activeChange.subscribe((v) => this.valueChange.emit(v));
	}
}
