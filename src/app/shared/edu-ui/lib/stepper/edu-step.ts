import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EduStepperService } from './edu-stepper.service';

@Component({
	selector: 'edu-step',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			type="button"
			role="tab"
			class="edu-step"
			[class.edu-step--active]="active()"
			[attr.aria-selected]="active()"
			[disabled]="disabled()"
			(click)="select()"
		>
			<span class="edu-step__marker"></span>
			<span class="edu-step__label"><ng-content></ng-content></span>
		</button>
	`,
	styleUrl: './edu-step.scss',
})
export class EduStep {
	readonly value = input.required<string>();
	readonly disabled = input(false);

	private readonly service = inject(EduStepperService);

	protected readonly active = computed(() => this.service.active() === this.value());

	protected select(): void {
		if (!this.disabled()) {
			this.service.select(this.value());
		}
	}
}
