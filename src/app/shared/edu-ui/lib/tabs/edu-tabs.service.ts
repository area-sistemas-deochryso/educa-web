import { EventEmitter, Injectable, signal } from '@angular/core';

/**
 * Shared active-tab state for edu-tabs/edu-tab/edu-tabpanel.
 * Not exported from public-api.ts — internal implementation detail.
 */
@Injectable()
export class EduTabsService {
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
