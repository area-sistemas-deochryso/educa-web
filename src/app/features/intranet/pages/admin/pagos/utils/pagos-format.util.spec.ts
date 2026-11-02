import { describe, expect, it } from 'vitest';

import { formatFechaConDia, formatPorcentaje, formatSoles } from './pagos-format.util';

describe('pagos-format.util', () => {
	describe('formatPorcentaje', () => {
		// INV-PG10: nada exigible o universo vacío llega como null; nunca «NaN %».
		it('muestra «—» cuando no hay porcentaje', () => {
			expect(formatPorcentaje(null)).toBe('—');
			expect(formatPorcentaje(undefined)).toBe('—');
		});

		it('conserva el cero como valor real', () => {
			expect(formatPorcentaje(0)).toBe('0.0 %');
		});

		it('formatea con 1 decimal', () => {
			expect(formatPorcentaje(87.456)).toBe('87.5 %');
		});
	});

	describe('formatSoles', () => {
		it('muestra siempre 2 decimales', () => {
			expect(formatSoles(320)).toMatch(/320\.00$/);
			expect(formatSoles(1234.5)).toMatch(/1,?234\.50$/);
		});
	});

	describe('formatFechaConDia', () => {
		it('incluye el día de la semana y no depende de la zona horaria', () => {
			// 2026-11-02 es lunes
			expect(formatFechaConDia('2026-11-02')).toMatch(/lun/i);
			expect(formatFechaConDia('2026-11-02T00:00:00')).toMatch(/02\/11\/2026/);
		});
	});
});
