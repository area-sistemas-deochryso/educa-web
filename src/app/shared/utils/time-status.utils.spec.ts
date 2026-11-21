import { describe, expect, it } from 'vitest';

import { getTimeStatus } from './time-status.utils';

describe('getTimeStatus', () => {
	it('es upcoming antes del inicio', () => {
		expect(getTimeStatus('2026-11-23', '2026-11-27', '2026-11-21')).toBe('upcoming');
	});

	it('es ongoing dentro del rango, bordes incluidos', () => {
		expect(getTimeStatus('2026-11-23', '2026-11-27', '2026-11-23')).toBe('ongoing');
		expect(getTimeStatus('2026-11-23', '2026-11-27', '2026-11-27')).toBe('ongoing');
	});

	it('es finished después del fin', () => {
		expect(getTimeStatus('2026-11-23', '2026-11-27', '2026-11-28')).toBe('finished');
	});

	it('sin fin dura solo su día de inicio', () => {
		expect(getTimeStatus('2026-11-20', null, '2026-11-20')).toBe('ongoing');
		expect(getTimeStatus('2026-11-20', undefined, '2026-11-21')).toBe('finished');
	});

	it('acepta Date y usa el día local', () => {
		const today = new Date(2026, 10, 21, 23, 59);
		expect(getTimeStatus('2026-11-21', null, today)).toBe('ongoing');
	});

	it('ignora la hora de un ISO completo', () => {
		expect(getTimeStatus('2026-11-21T00:00:00', null, '2026-11-21')).toBe('ongoing');
	});
});
