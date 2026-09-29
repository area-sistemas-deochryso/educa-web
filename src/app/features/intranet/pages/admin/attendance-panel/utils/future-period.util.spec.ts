import { describe, expect, it } from 'vitest';

import { getFutureNotice } from './future-period.util';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('getFutureNotice', () => {
	const hoy = d(2026, 9, 16); // miércoles

	it('no aplica en rango Día', () => {
		expect(getFutureNotice('dia', d(2026, 12, 1), hoy)).toBeNull();
	});

	it('semana en curso → parcial hasta hoy', () => {
		expect(getFutureNotice('semana', d(2026, 9, 14), hoy)).toEqual({
			kind: 'partial',
			until: hoy,
		});
	});

	it('semana totalmente futura → total', () => {
		expect(getFutureNotice('semana', d(2026, 9, 21), hoy)).toEqual({ kind: 'total' });
	});

	it('semana pasada → sin aviso', () => {
		expect(getFutureNotice('semana', d(2026, 9, 7), hoy)).toBeNull();
	});

	it('semana con hoy = viernes → sin aviso (periodo completo)', () => {
		expect(getFutureNotice('semana', d(2026, 9, 14), d(2026, 9, 18))).toBeNull();
	});

	it('mes en curso → parcial', () => {
		expect(getFutureNotice('mes', d(2026, 9, 1), hoy)).toEqual({ kind: 'partial', until: hoy });
	});

	it('mes futuro → total', () => {
		expect(getFutureNotice('mes', d(2026, 10, 5), hoy)).toEqual({ kind: 'total' });
	});

	it('mes pasado → sin aviso', () => {
		expect(getFutureNotice('mes', d(2026, 8, 20), hoy)).toBeNull();
	});
});
