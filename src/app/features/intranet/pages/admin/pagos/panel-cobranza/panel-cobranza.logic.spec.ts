import { describe, expect, it } from 'vitest';

import { formatPorcentaje } from '../utils/pagos-format.util';
import { esFechaFutura, totalExclusivo, validarFechaCorte } from './panel-cobranza.logic';

describe('panel-cobranza.logic', () => {
	it('formatea un porcentaje null como guion, sin NaN (INV-PG10)', () => {
		expect(formatPorcentaje(null)).toBe('—');
		expect(formatPorcentaje(null)).not.toContain('NaN');
	});

	it('no suma los conteos transversales al total (INV-PG14)', () => {
		const total = totalExclusivo({
			alDia: 10,
			pagoParcial: 3,
			conDeuda: 2,
			conDatosSinConfirmar: 7,
			sinCargos: 9,
		});
		expect(total).toBe(15);
	});

	it('rechaza una fecha futura y la que cae fuera del año', () => {
		expect(esFechaFutura('2026-11-03', '2026-11-02')).toBe(true);
		expect(esFechaFutura('2026-11-02', '2026-11-02')).toBe(false);
		expect(validarFechaCorte('2026-12-01', 2026, '2026-11-02')).toMatch(/futura/);
		expect(validarFechaCorte('2025-12-01', 2026, '2026-11-02')).toMatch(/2026/);
		expect(validarFechaCorte('2026-05-15', 2026, '2026-11-02')).toBeNull();
	});
});
