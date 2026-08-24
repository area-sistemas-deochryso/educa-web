import { EventEmitter, Injectable, signal } from '@angular/core';

export type EduTabValue = string | number;

/**
 * Shared active-tab state for edu-tabs/edu-tab/edu-tabpanel.
 * Not exported from public-api.ts — internal implementation detail.
 */
@Injectable()
export class EduTabsService {
	readonly active = signal<EduTabValue | undefined>(undefined);
	readonly activeChange = new EventEmitter<EduTabValue>();

	select(value: EduTabValue): void {
		if (this.active() === value) {
			return;
		}
		this.active.set(value);
		this.activeChange.emit(value);
	}
}
