import { EventEmitter, Injectable, signal } from '@angular/core';

export type EduStepValue = string | number;

/**
 * Shared active-step state for edu-stepper/edu-step-list/edu-step/edu-step-panels/edu-step-panel.
 * Not exported from public-api.ts — internal implementation detail.
 */
@Injectable()
export class EduStepperService {
	readonly active = signal<EduStepValue | undefined>(undefined);
	readonly activeChange = new EventEmitter<EduStepValue>();

	select(value: EduStepValue): void {
		if (this.active() === value) {
			return;
		}
		this.active.set(value);
		this.activeChange.emit(value);
	}
}
