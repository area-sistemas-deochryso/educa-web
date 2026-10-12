import { describe, expect, it } from 'vitest';

import { formatHint, parseDate } from './date-picker-utils';

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
