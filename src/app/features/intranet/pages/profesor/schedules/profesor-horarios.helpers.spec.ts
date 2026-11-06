// #region Imports
import { describe, expect, it } from 'vitest';

import { buildCountdownMap, type HorarioBlock } from './profesor-horarios.helpers';
// #endregion

// #region Tests
describe('buildCountdownMap', () => {
	// Lunes 9 de noviembre de 2026, 10:00 local (dia = 1)
	const now = new Date(2026, 10, 9, 10, 0, 0);

	const block = (id: number, dia: number, horaInicio: string): HorarioBlock =>
		({ id, dia, horaInicio, horaFin: '23:00' }) as HorarioBlock;

	const infoOf = (b: HorarioBlock) => {
		const info = buildCountdownMap([b], now).get(b.id);
		if (!info) throw new Error(`sin countdown para el bloque ${b.id}`);
		return info;
	};

	it('lista vacía → mapa vacío', () => {
		expect(buildCountdownMap([], now).size).toBe(0);
	});

	it('indexa por id de bloque', () => {
		const map = buildCountdownMap([block(7, 1, '10:30'), block(9, 1, '12:00')], now);
		expect([...map.keys()]).toEqual([7, 9]);
		expect(map.get(7)?.blockId).toBe(7);
	});

	describe('urgencia', () => {
		it('<10 min → danger', () => {
			expect(infoOf(block(1, 1, '10:05'))).toMatchObject({ urgency: 'danger', label: 'en 5m 0s' });
		});

		it('10-29 min → danger-low', () => {
			expect(infoOf(block(1, 1, '10:10')).urgency).toBe('danger-low');
			expect(infoOf(block(1, 1, '10:29')).urgency).toBe('danger-low');
		});

		it('30-59 min → warning', () => {
			expect(infoOf(block(1, 1, '10:30')).urgency).toBe('warning');
			expect(infoOf(block(1, 1, '10:59')).urgency).toBe('warning');
		});

		it('>=60 min → normal', () => {
			expect(infoOf(block(1, 1, '11:00')).urgency).toBe('normal');
		});
	});

	describe('etiqueta', () => {
		it('horas y minutos cuando faltan >= 1h', () => {
			expect(infoOf(block(1, 1, '12:15')).label).toBe('en 2h 15m');
		});

		it('días y horas cuando faltan >= 1 día', () => {
			// Martes 11:00 → 1 día y 1 hora
			expect(infoOf(block(1, 2, '11:00')).label).toBe('en 1d 1h');
		});
	});

	describe('próxima ocurrencia', () => {
		it('mismo día pero hora ya pasada → semana siguiente', () => {
			// Lunes 09:00 con now = lunes 10:00 → faltan 6d 23h
			expect(infoOf(block(1, 1, '09:00'))).toMatchObject({ urgency: 'normal', label: 'en 6d 23h' });
		});

		it('día posterior de la semana', () => {
			// Miércoles 10:00 → 2 días exactos
			expect(infoOf(block(1, 3, '10:00')).label).toBe('en 2d 0h');
		});
	});
});
// #endregion
