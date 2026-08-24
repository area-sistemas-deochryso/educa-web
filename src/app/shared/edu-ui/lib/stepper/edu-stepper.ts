import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { EduStepperService } from './edu-stepper.service';

@Component({
	selector: 'edu-stepper',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [EduStepperService],
	template: `<div class="edu-stepper"><ng-content></ng-content></div>`,
	styleUrl: './edu-stepper.scss',
})
export class EduStepper {
	readonly value = input<string>();
	readonly valueChange = output<string>();

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
