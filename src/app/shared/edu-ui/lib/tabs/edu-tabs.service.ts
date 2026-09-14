import { ElementRef, EventEmitter, Injectable, signal } from '@angular/core';

export type EduTabValue = string | number;

let nextGroupId = 0;

interface RegisteredTab {
	value: EduTabValue;
	disabled: () => boolean;
	el: ElementRef<HTMLElement>;
}

/**
 * Shared active-tab state for edu-tabs/edu-tab/edu-tabpanel.
 * Not exported from public-api.ts — internal implementation detail.
 */
@Injectable()
export class EduTabsService {
	readonly groupId = `edu-tabs-${nextGroupId++}`;
	readonly active = signal<EduTabValue | undefined>(undefined);
	readonly activeChange = new EventEmitter<EduTabValue>();

	private readonly tabs: RegisteredTab[] = [];

	select(value: EduTabValue): void {
		if (this.active() === value) {
			return;
		}
		this.active.set(value);
		this.activeChange.emit(value);
	}

	tabId(value: EduTabValue): string {
		return `${this.groupId}-tab-${value}`;
	}

	panelId(value: EduTabValue): string {
		return `${this.groupId}-panel-${value}`;
	}

	registerTab(value: EduTabValue, disabled: () => boolean, el: ElementRef<HTMLElement>): void {
		const existing = this.tabs.findIndex((t) => t.value === value);
		if (existing >= 0) {
			this.tabs[existing] = { value, disabled, el };
		} else {
			this.tabs.push({ value, disabled, el });
		}
	}

	unregisterTab(value: EduTabValue): void {
		const i = this.tabs.findIndex((t) => t.value === value);
		if (i >= 0) {
			this.tabs.splice(i, 1);
		}
	}

	/** Roving-tabindex navigation: selects and focuses the next enabled tab in `direction`, wrapping around. */
	focusAdjacent(current: EduTabValue, direction: 1 | -1): void {
		const length = this.tabs.length;
		if (length === 0) {
			return;
		}
		const idx = this.tabs.findIndex((t) => t.value === current);
		if (idx < 0) {
			return;
		}
		for (let step = 1; step <= length; step++) {
			const next = this.tabs[(idx + direction * step + 2 * length) % length];
			if (!next.disabled()) {
				this.select(next.value);
				next.el.nativeElement.focus();
				return;
			}
		}
	}
}
