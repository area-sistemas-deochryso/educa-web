// * Tests for attendance.models helpers — leyenda a partir de los conteos de la tabla (INV-C15).
import { describe, expect, it } from 'vitest';

import { computeStatsFromTableCounts } from './attendance.models';

describe('computeStatsFromTableCounts', () => {
	it('mapea los conteos de la tabla a la leyenda e incluye las faltas por día sin registro', () => {
		// Mayo 2026 de la profesora de prueba: 1 F de registro + 11 F de días hábiles sin registro.
		const stats = computeStatsFromTableCounts({ A: 7, T: 4, F: 12, J: 0, '-': 0 });

		expect(stats).toEqual({
			total: 23,
			asistio: 7,
			tardanza: 4,
			falta: 12,
			justificado: 0,
			pendiente: 0,
		});
	});

	it('conteos en cero devuelven todo en cero', () => {
		const stats = computeStatsFromTableCounts({ A: 0, T: 0, F: 0, J: 0, '-': 0 });

		expect(stats.total).toBe(0);
		expect(stats.falta).toBe(0);
	});

	it('el pendiente cuenta en el total pero no como falta', () => {
		const stats = computeStatsFromTableCounts({ A: 1, T: 0, F: 0, J: 1, '-': 3 });

		expect(stats).toMatchObject({ asistio: 1, justificado: 1, pendiente: 3, falta: 0, total: 5 });
	});
});
