// #region Table Utilities

/** Shape mínimo del evento lazy load de PrimeNG p-table */
export interface LazyLoadEvent {
	first?: number;
	rows?: number;
}

/**
 * Calcula página (1-based) y rows a partir del evento lazy load de p-table.
 *
 * @example
 * const { page, rows } = calcPageFromLazyEvent({ first: 20, rows: 10 });
 * // page = 3, rows = 10
 */
export function calcPageFromLazyEvent(event: LazyLoadEvent): { page: number; rows: number } {
	const first = event.first ?? 0;
	const rows = event.rows ?? 10;
	return { page: Math.floor(first / rows) + 1, rows };
}
// #endregion
