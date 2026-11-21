import { describe, expect, it } from 'vitest';

import { dateToYmd, ymdToDate } from './date-string.utils';

describe('ymdToDate', () => {
	it('convierte YYYY-MM-DD a medianoche local', () => {
		const date = ymdToDate('2026-11-23');
		expect(date?.getFullYear()).toBe(2026);
		expect(date?.getMonth()).toBe(10);
		expect(date?.getDate()).toBe(23);
		expect(date?.getHours()).toBe(0);
	});

	it('acepta un ISO completo y usa solo el día', () => {
		expect(dateToYmd(ymdToDate('2026-01-02T00:00:00'))).toBe('2026-01-02');
	});

	it('devuelve null con vacío, nulo o formato inválido', () => {
		expect(ymdToDate('')).toBeNull();
		expect(ymdToDate(null)).toBeNull();
		expect(ymdToDate(undefined)).toBeNull();
		expect(ymdToDate('23/11/2026')).toBeNull();
	});

	it('rechaza fechas imposibles en vez de desbordarlas', () => {
		expect(ymdToDate('2026-02-31')).toBeNull();
	});
});

describe('dateToYmd', () => {
	it('formatea en hora local con ceros a la izquierda', () => {
		expect(dateToYmd(new Date(2026, 0, 5))).toBe('2026-01-05');
	});

	it('no se corre un día por la zona horaria', () => {
		expect(dateToYmd(new Date(2026, 10, 23, 23, 59))).toBe('2026-11-23');
	});

	it('devuelve cadena vacía con nulo o fecha inválida', () => {
		expect(dateToYmd(null)).toBe('');
		expect(dateToYmd(undefined)).toBe('');
		expect(dateToYmd(new Date('x'))).toBe('');
	});

	it('hace ida y vuelta con ymdToDate', () => {
		expect(dateToYmd(ymdToDate('2026-12-31'))).toBe('2026-12-31');
	});
});
