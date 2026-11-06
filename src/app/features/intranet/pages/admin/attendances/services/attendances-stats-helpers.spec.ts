// #region Imports
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AsistenciaAdminLista } from '../models';
import type { AttendancesAdminStore } from './attendances-admin.store';
import {
	applyActualizarHorasDelta,
	applyItemStatsDelta,
	applySalidaTransitionDelta,
} from './attendances-stats-helpers';
// #endregion

// #region Tests
describe('attendances-stats-helpers', () => {
	const incrementarEstadistica = vi.fn();
	const store = { incrementarEstadistica } as unknown as AttendancesAdminStore;

	const item = (over: Partial<AsistenciaAdminLista> = {}) =>
		({ estado: 'Completa', origenManual: false, ...over }) as AsistenciaAdminLista;

	/** Efecto neto por estadística (suma de deltas) para no depender del orden de llamadas. */
	function net(): Record<string, number> {
		const acc: Record<string, number> = {};
		for (const [key, delta] of incrementarEstadistica.mock.calls) {
			acc[key] = (acc[key] ?? 0) + delta;
		}
		return acc;
	}

	beforeEach(() => incrementarEstadistica.mockReset());

	describe('applyItemStatsDelta', () => {
		it('item completo y de webhook suma total, completas y webhook', () => {
			applyItemStatsDelta(store, item({ estado: 'Completa', origenManual: false }), 1);
			expect(net()).toEqual({ totalRegistros: 1, completas: 1, registrosWebhook: 1 });
		});

		it('item incompleto y manual suma total, incompletas y manuales', () => {
			applyItemStatsDelta(store, item({ estado: 'Incompleta', origenManual: true }), 1);
			expect(net()).toEqual({ totalRegistros: 1, incompletas: 1, registrosManuales: 1 });
		});

		it('sign -1 revierte (rollback)', () => {
			applyItemStatsDelta(store, item(), 1);
			applyItemStatsDelta(store, item(), -1);
			expect(net()).toEqual({ totalRegistros: 0, completas: 0, registrosWebhook: 0 });
		});
	});

	describe('applySalidaTransitionDelta', () => {
		it('sin snapshot no hace nada', () => {
			applySalidaTransitionDelta(store, undefined, 1);
			expect(incrementarEstadistica).not.toHaveBeenCalled();
		});

		it('Incompleta + webhook → pasa a completa y manual', () => {
			applySalidaTransitionDelta(store, item({ estado: 'Incompleta', origenManual: false }), 1);
			expect(net()).toEqual({
				completas: 1,
				incompletas: -1,
				registrosManuales: 1,
				registrosWebhook: -1,
			});
		});

		it('Completa + manual no cambia nada', () => {
			applySalidaTransitionDelta(store, item({ estado: 'Completa', origenManual: true }), 1);
			expect(incrementarEstadistica).not.toHaveBeenCalled();
		});

		it('rollback (-1) invierte los deltas', () => {
			applySalidaTransitionDelta(store, item({ estado: 'Incompleta', origenManual: false }), -1);
			expect(net()).toEqual({
				completas: -1,
				incompletas: 1,
				registrosManuales: -1,
				registrosWebhook: 1,
			});
		});
	});

	describe('applyActualizarHorasDelta', () => {
		it('Incompleta → Completa mueve una unidad de incompletas a completas', () => {
			applyActualizarHorasDelta(store, item({ estado: 'Incompleta', origenManual: true }), 'Completa', 1);
			expect(net()).toEqual({ completas: 1, incompletas: -1 });
		});

		it('Completa → Incompleta mueve una unidad de completas a incompletas', () => {
			applyActualizarHorasDelta(store, item({ estado: 'Completa', origenManual: true }), 'Incompleta', 1);
			expect(net()).toEqual({ completas: -1, incompletas: 1 });
		});

		it('mismo estado y ya manual no cambia nada', () => {
			applyActualizarHorasDelta(store, item({ estado: 'Completa', origenManual: true }), 'Completa', 1);
			expect(incrementarEstadistica).not.toHaveBeenCalled();
		});

		it('origen webhook pasa a manual aunque el estado no cambie', () => {
			applyActualizarHorasDelta(store, item({ estado: 'Completa', origenManual: false }), 'Completa', 1);
			expect(net()).toEqual({ registrosManuales: 1, registrosWebhook: -1 });
		});

		it('rollback (-1) deshace la transición de estado y de origen', () => {
			applyActualizarHorasDelta(store, item({ estado: 'Incompleta', origenManual: false }), 'Completa', 1);
			applyActualizarHorasDelta(store, item({ estado: 'Incompleta', origenManual: false }), 'Completa', -1);
			expect(net()).toEqual({
				completas: 0,
				incompletas: 0,
				registrosManuales: 0,
				registrosWebhook: 0,
			});
		});
	});
});
// #endregion
