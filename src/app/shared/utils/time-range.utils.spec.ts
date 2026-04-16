// Tests for time-range utils — invariantes INV-C06 (overlap), INV-C07 (HoraInicio < HoraFin),
// aplicadas a INV-U03/U04/U05 (sin doble reserva salón/profesor/estudiante).
import { describe, expect, it } from 'vitest';

import { timeRangesOverlap, validateTimeRange, createTimeRange } from './time-range.utils';

describe('time-range.utils', () => {
	// #region INV-C07 — HoraInicio < HoraFin (duración > 0)
	describe('validateTimeRange — INV-C07', () => {
		it('rechaza horaInicio vacío', () => {
			expect(validateTimeRange('', '09:00')?.field).toBe('horaInicio');
		});

		it('rechaza horaFin vacío', () => {
			expect(validateTimeRange('08:00', '')?.field).toBe('horaFin');
		});

		it('rechaza formato inválido', () => {
			expect(validateTimeRange('8:00', '09:00')?.field).toBe('horaInicio');
			expect(validateTimeRange('08:00', '25:00')?.field).toBe('horaFin');
		});

		it('rechaza horaFin == horaInicio (duración cero)', () => {
			expect(validateTimeRange('08:00', '08:00')?.field).toBe('range');
		});

		it('rechaza horaFin < horaInicio', () => {
			expect(validateTimeRange('10:00', '09:00')?.field).toBe('range');
		});

		it('acepta rango válido', () => {
			expect(validateTimeRange('08:00', '09:00')).toBeNull();
		});

		it('createTimeRange lanza con rango inválido', () => {
			expect(() => createTimeRange('10:00', '09:00')).toThrow();
		});
	});
	// #endregion

	// #region INV-C06 — Superposición (fórmula: I1 < F2 AND F1 > I2)
	describe('timeRangesOverlap — INV-C06 (5 casos de superposición + 2 no-overlap)', () => {
		const base = { horaInicio: '08:00', horaFin: '10:00' };

		it('caso 1: exacta (A == B) → overlap', () => {
			expect(timeRangesOverlap(base, { horaInicio: '08:00', horaFin: '10:00' })).toBe(true);
		});

		it('caso 2: A contiene B → overlap', () => {
			expect(timeRangesOverlap(base, { horaInicio: '08:30', horaFin: '09:30' })).toBe(true);
		});

		it('caso 3: B contiene A → overlap', () => {
			expect(timeRangesOverlap(base, { horaInicio: '07:00', horaFin: '11:00' })).toBe(true);
		});

		it('caso 4: A empieza antes, solape parcial → overlap', () => {
			expect(timeRangesOverlap(base, { horaInicio: '09:00', horaFin: '11:00' })).toBe(true);
		});

		it('caso 5: B empieza antes, solape parcial → overlap', () => {
			expect(timeRangesOverlap(base, { horaInicio: '07:00', horaFin: '09:00' })).toBe(true);
		});

		it('caso 6: separados (A antes de B) → no overlap', () => {
			expect(timeRangesOverlap(base, { horaInicio: '11:00', horaFin: '12:00' })).toBe(false);
		});

		it('caso 7: adyacentes (F1 == I2, clases consecutivas) → no overlap', () => {
			expect(timeRangesOverlap(base, { horaInicio: '10:00', horaFin: '11:00' })).toBe(false);
		});

		it('caso 7 inverso: adyacentes (F2 == I1) → no overlap', () => {
			expect(timeRangesOverlap(base, { horaInicio: '07:00', horaFin: '08:00' })).toBe(false);
		});
	});
	// #endregion
});
