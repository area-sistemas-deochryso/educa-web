import { signal } from '@angular/core';

/**
 * Shared arrow-key/Enter/Escape navigation over a flat option list — used by
 * edu-select, edu-multi-select and edu-autocomplete panels.
 */
export class SelectListNav {
	private readonly index = signal(-1);

	readonly activeIndex = this.index.asReadonly();

	reset(): void {
		this.index.set(-1);
	}

	next(length: number): void {
		if (length === 0) {
			return;
		}
		this.index.set(Math.min(this.index() + 1, length - 1));
	}

	prev(): void {
		this.index.set(Math.max(this.index() - 1, 0));
	}

	setActive(i: number): void {
		this.index.set(i);
	}
}
