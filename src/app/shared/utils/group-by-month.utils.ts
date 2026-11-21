// #region Implementation
export interface MonthGroup<T> {
	/** 'YYYY-MM' */
	key: string;
	year: number;
	/** 0-11 */
	month: number;
	/** Ej: 'Noviembre 2026' */
	label: string;
	items: T[];
}

const MONTH_NAMES = [
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Setiembre',
	'Octubre',
	'Noviembre',
	'Diciembre',
];

const MONTH_KEY = /^(\d{4})-(\d{2})/;

/**
 * Agrupa por mes calendario del inicio. Los grupos salen ordenados cronológicamente;
 * dentro de cada grupo se conserva el orden de entrada. Ítems con fecha no 'YYYY-MM-…' se omiten.
 */
export function groupByMonth<T>(items: readonly T[], getDate: (item: T) => string): MonthGroup<T>[] {
	const groups = new Map<string, MonthGroup<T>>();

	for (const item of items) {
		const match = MONTH_KEY.exec(getDate(item));
		if (!match) continue;

		const key = `${match[1]}-${match[2]}`;
		let group = groups.get(key);
		if (!group) {
			const year = Number(match[1]);
			const month = Number(match[2]) - 1;
			group = { key, year, month, label: `${MONTH_NAMES[month] ?? ''} ${year}`, items: [] };
			groups.set(key, group);
		}
		group.items.push(item);
	}

	return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}
// #endregion
