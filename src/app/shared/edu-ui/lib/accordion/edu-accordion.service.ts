import { EventEmitter, Injectable, signal } from '@angular/core';

let nextGroupId = 0;

/**
 * Shared expanded-panels state for edu-accordion/edu-accordion-panel/edu-accordion-header.
 * Normalizes to an array of expanded panel values regardless of `multiple` — the container
 * converts to/from `string | string[]` at the input/output boundary.
 * Not exported from public-api.ts — internal implementation detail.
 */
@Injectable()
export class EduAccordionService {
	readonly groupId = `edu-accordion-${nextGroupId++}`;
	readonly multiple = signal(false);
	readonly expanded = signal<string[]>([]);
	readonly expandedChange = new EventEmitter<string[]>();

	isExpanded(value: string): boolean {
		return this.expanded().includes(value);
	}

	headerId(value: string): string {
		return `${this.groupId}-header-${value}`;
	}

	panelId(value: string): string {
		return `${this.groupId}-panel-${value}`;
	}

	toggle(value: string): void {
		const current = this.expanded();
		const isOpen = current.includes(value);
		const next = this.multiple()
			? (isOpen ? current.filter((v) => v !== value) : [...current, value])
			: (isOpen ? [] : [value]);
		this.expanded.set(next);
		this.expandedChange.emit(next);
	}
}
