import { describe, expect, it } from 'vitest';

import { buildYearOptions } from './year-options.utils';

describe('buildYearOptions', () => {
	it('arma la ventana alrededor del año actual', () => {
		const years = buildYearOptions(null, { now: 2026 }).map((o) => o.value);
		expect(years).toEqual([2025, 2026, 2027, 2028]);
	});

	it('agrega el año elegido si está fuera de la ventana', () => {
		const years = buildYearOptions(2030, { now: 2026 }).map((o) => o.value);
		expect(years).toEqual([2025, 2026, 2027, 2028, 2030]);
	});

	it('no duplica el año elegido dentro de la ventana', () => {
		expect(buildYearOptions(2026, { now: 2026 })).toHaveLength(4);
	});

	it('etiqueta cada año como texto', () => {
		expect(buildYearOptions(null, { now: 2026, back: 0, ahead: 0 })).toEqual([{ label: '2026', value: 2026 }]);
	});
});
