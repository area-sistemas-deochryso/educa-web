import { EventEmitter, Injectable, signal } from '@angular/core';
import type { EduTableSortEvent, EduTableSortOrder } from './edu-table';

/**
 * Shared sort state for edu-table/eduSortableColumn.
 * Not exported from public-api.ts — internal implementation detail.
 */
@Injectable()
export class EduTableService {
	readonly sortField = signal<string | null>(null);
	readonly sortOrder = signal<EduTableSortOrder>(null);
	readonly sortChange = new EventEmitter<EduTableSortEvent>();

	toggle(field: string): void {
		const isActive = this.sortField() === field;
		const current = isActive ? this.sortOrder() : null;
		const nextOrder: EduTableSortOrder = current === 'asc' ? 'desc' : current === 'desc' ? null : 'asc';

		this.sortField.set(nextOrder ? field : null);
		this.sortOrder.set(nextOrder);
		this.sortChange.emit({ field, order: nextOrder });
	}
}
