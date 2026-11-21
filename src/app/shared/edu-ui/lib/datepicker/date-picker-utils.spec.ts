import { describe, expect, it } from 'vitest';

import { coerceDateValue, formatHint, parseDate } from './date-picker-utils';

describe('coerceDateValue', () => {
	it('deja pasar un Date válido', () => {
		const date = new Date(2026, 0, 2);
		expect(coerceDateValue(date, 'dd/mm/yyyy')).toBe(date);
	});

	it('rechaza un Date inválido', () => {
		expect(coerceDateValue(new Date('x'), 'dd/mm/yyyy')).toBeNull();
	});

	it.each([[''], ['   '], [null], [undefined], [42], [{}]])('devuelve null con %j', (value) => {
		expect(coerceDateValue(value, 'dd/mm/yyyy')).toBeNull();
	});

	it('lee YYYY-MM-DD como ese día local', () => {
		const date = coerceDateValue('2026-01-02', 'dd/mm/yyyy');
		expect([date?.getFullYear(), date?.getMonth(), date?.getDate(), date?.getHours()]).toEqual([2026, 0, 2, 0]);
	});

	it('rechaza una fecha ISO imposible', () => {
		expect(coerceDateValue('2026-02-31', 'dd/mm/yyyy')).toBeNull();
	});

	it('conserva la hora de un ISO con hora', () => {
		const date = coerceDateValue('2026-01-02T08:30:00', 'dd/mm/yyyy');
		expect([date?.getDate(), date?.getHours(), date?.getMinutes()]).toEqual([2, 8, 30]);
	});

	it('lee texto en el formato del campo', () => {
		expect(coerceDateValue('15/10/2026', 'dd/mm/yyyy')?.getMonth()).toBe(9);
	});

	it('devuelve null con texto que no es fecha', () => {
		expect(coerceDateValue('no-es-fecha', 'dd/mm/yyyy')).toBeNull();
	});
});

describe('parseDate', () => {
	it.each([
		['15/10/26', 'dd/mm/yy'],
		['15/10/2026', 'dd/mm/yy'],
		['15/10/2026', 'dd/mm/yyyy'],
		['15/10/26', 'dd/mm/yyyy'],
		['26-10-15', 'yy-mm-dd'],
		['2026-10-15', 'yy-mm-dd'],
	])('reads %s with format %s as 15 Oct 2026', (text, format) => {
		const parsed = parseDate(text, format);

		expect(parsed?.getFullYear()).toBe(2026);
		expect(parsed?.getMonth()).toBe(9);
		expect(parsed?.getDate()).toBe(15);
	});

	it('accepts day and month without leading zero', () => {
		const parsed = parseDate('5/1/2026', 'dd/mm/yy');

		expect(parsed?.getMonth()).toBe(0);
		expect(parsed?.getDate()).toBe(5);
	});

	it.each(['', 'hola', '15/10', '15/10/202', '15/10/20267', '15-10-2026'])(
		'returns null for unparseable text "%s"',
		(text) => {
			expect(parseDate(text, 'dd/mm/yy')).toBeNull();
		},
	);

	it.each(['31/02/2026', '32/01/2026', '15/13/2026', '00/10/2026', '15/00/2026'])(
		'returns null for a date that does not exist: %s',
		(text) => {
			expect(parseDate(text, 'dd/mm/yy')).toBeNull();
		},
	);
});

describe('formatHint', () => {
	it('names the year token in Spanish', () => {
		expect(formatHint('dd/mm/yy')).toBe('dd/mm/aa');
		expect(formatHint('dd/mm/yyyy')).toBe('dd/mm/aaaa');
		expect(formatHint('yy-mm-dd')).toBe('aa-mm-dd');
	});
});
