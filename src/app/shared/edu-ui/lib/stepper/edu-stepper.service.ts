import { EventEmitter, Injectable, signal } from '@angular/core';

/**
 * Shared active-step state for edu-stepper/edu-step-list/edu-step.
 * Not exported from public-api.ts — internal implementation detail.
 */
@Injectable()
export class EduStepperService {
	readonly active = signal<string | undefined>(undefined);
	readonly activeChange = new EventEmitter<string>();

	select(value: string): void {
		if (this.active() === value) {
			return;
		}
		this.active.set(value);
		this.activeChange.emit(value);
	}
}
