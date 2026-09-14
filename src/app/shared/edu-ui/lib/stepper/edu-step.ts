import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	computed,
	effect,
	inject,
	input,
	viewChild,
} from '@angular/core';
import { EduStepperService, EduStepValue } from './edu-stepper.service';

@Component({
	selector: 'edu-step',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<button
			#stepButton
			type="button"
			role="tab"
			class="edu-step"
			[class.edu-step--active]="active()"
			[attr.aria-selected]="active()"
			[attr.tabindex]="tabIndexValue()"
			[disabled]="disabled()"
			(click)="select()"
			(keydown.ArrowLeft)="onArrow($event, -1)"
			(keydown.ArrowRight)="onArrow($event, 1)"
		>
			<span class="edu-step__marker"></span>
			<span class="edu-step__label"><ng-content></ng-content></span>
		</button>
	`,
	styleUrl: './edu-step.scss',
})
export class EduStep {
	readonly value = input.required<EduStepValue>();
	readonly disabled = input(false);

	private readonly service = inject(EduStepperService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly buttonRef = viewChild<ElementRef<HTMLButtonElement>>('stepButton');

	protected readonly active = computed(() => this.service.active() === this.value());
	protected readonly tabIndexValue = computed(() => (this.active() ? 0 : -1));

	constructor() {
		effect(() => {
			const el = this.buttonRef();
			if (el) {
				this.service.registerStep(this.value(), () => this.disabled(), el);
			}
		});
		this.destroyRef.onDestroy(() => this.service.unregisterStep(this.value()));
	}

	protected select(): void {
		if (!this.disabled()) {
			this.service.select(this.value());
		}
	}

	protected onArrow(event: Event, direction: 1 | -1): void {
		event.preventDefault();
		this.service.focusAdjacent(this.value(), direction);
	}
}
