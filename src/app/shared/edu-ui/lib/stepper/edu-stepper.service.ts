import { ElementRef, EventEmitter, Injectable, signal } from '@angular/core';

export type EduStepValue = string | number;

interface RegisteredStep {
	value: EduStepValue;
	disabled: () => boolean;
	el: ElementRef<HTMLElement>;
}

/**
 * Shared active-step state for edu-stepper/edu-step-list/edu-step/edu-step-panels/edu-step-panel.
 * Not exported from public-api.ts — internal implementation detail.
 */
@Injectable()
export class EduStepperService {
	readonly active = signal<EduStepValue | undefined>(undefined);
	readonly activeChange = new EventEmitter<EduStepValue>();

	private readonly steps: RegisteredStep[] = [];

	select(value: EduStepValue): void {
		if (this.active() === value) {
			return;
		}
		this.active.set(value);
		this.activeChange.emit(value);
	}

	registerStep(value: EduStepValue, disabled: () => boolean, el: ElementRef<HTMLElement>): void {
		const existing = this.steps.findIndex((s) => s.value === value);
		if (existing >= 0) {
			this.steps[existing] = { value, disabled, el };
		} else {
			this.steps.push({ value, disabled, el });
		}
	}

	unregisterStep(value: EduStepValue): void {
		const i = this.steps.findIndex((s) => s.value === value);
		if (i >= 0) {
			this.steps.splice(i, 1);
		}
	}

	/** Roving-tabindex navigation: selects and focuses the next enabled step in `direction`, wrapping around. */
	focusAdjacent(current: EduStepValue, direction: 1 | -1): void {
		const length = this.steps.length;
		if (length === 0) {
			return;
		}
		const idx = this.steps.findIndex((s) => s.value === current);
		if (idx < 0) {
			return;
		}
		for (let step = 1; step <= length; step++) {
			const next = this.steps[(idx + direction * step + 2 * length) % length];
			if (!next.disabled()) {
				this.select(next.value);
				next.el.nativeElement.focus();
				return;
			}
		}
	}
}
