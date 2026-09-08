import { Signal, computed, signal } from '@angular/core';
import type { EduPaginatorPageEvent } from '@edu-ui';

export interface ClientPaging<T> {
	readonly value: Signal<readonly T[]>;
	readonly totalRecords: Signal<number>;
	readonly first: Signal<number>;
	onPageChange(event: EduPaginatorPageEvent): void;
}

/**
 * `edu-table` no recorta `[value]` por página ni calcula `[totalRecords]` — a diferencia de
 * `p-table`, delega ambos al consumidor (ver `edu-table.ts`). Este helper cubre el caso
 * client-side: toda la lista ya está en memoria, solo falta paginarla en el cliente.
 */
export function createClientPaging<T>(source: Signal<readonly T[]>, initialRows = 10): ClientPaging<T> {
	const first = signal(0);
	const rows = signal(initialRows);

	const value = computed(() => source().slice(first(), first() + rows()));
	const totalRecords = computed(() => source().length);

	function onPageChange(event: EduPaginatorPageEvent): void {
		first.set(event.first);
		rows.set(event.rows);
	}

	return { value, totalRecords, first: first.asReadonly(), onPageChange };
}
