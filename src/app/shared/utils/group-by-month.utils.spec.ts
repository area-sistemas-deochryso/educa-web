import { describe, expect, it } from 'vitest';

import { groupByMonth } from './group-by-month.utils';

describe('groupByMonth', () => {
	const items = [
		{ id: 1, date: '2026-12-04' },
		{ id: 2, date: '2026-11-23' },
		{ id: 3, date: '2026-11-20' },
		{ id: 4, date: '2027-01-11' },
	];

	it('ordena los grupos cronológicamente', () => {
		const keys = groupByMonth(items, (i) => i.date).map((g) => g.key);
		expect(keys).toEqual(['2026-11', '2026-12', '2027-01']);
	});

	it('conserva el orden de entrada dentro de cada grupo', () => {
		const nov = groupByMonth(items, (i) => i.date)[0];
		expect(nov.items.map((i) => i.id)).toEqual([2, 3]);
	});

	it('arma etiqueta, año y mes 0-11', () => {
		const [nov] = groupByMonth(items, (i) => i.date);
		expect(nov.label).toBe('Noviembre 2026');
		expect(nov.year).toBe(2026);
		expect(nov.month).toBe(10);
	});

	it('omite fechas inválidas', () => {
		expect(groupByMonth([{ date: 'sin-fecha' }], (i) => i.date)).toEqual([]);
	});

	it('devuelve vacío sin ítems', () => {
		expect(groupByMonth([], () => '')).toEqual([]);
	});
});
