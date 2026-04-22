// * Tests for Plan 27 · INV-C11 attendance scope helpers.
// #region Imports
import { describe, expect, it } from 'vitest';
import {
	UMBRAL_GRADO_ASISTENCIA_DIARIA,
	GRADO_ORDEN_MAP,
	esGradoAsistenciaDiaria,
	resolverGraOrden,
} from './attendance-scope';
// #endregion

describe('attendance-scope — Plan 27 · INV-C11', () => {
	describe('UMBRAL_GRADO_ASISTENCIA_DIARIA', () => {
		it('mirror del BE: el umbral es 8 (5to Primaria en adelante)', () => {
			expect(UMBRAL_GRADO_ASISTENCIA_DIARIA).toBe(8);
		});
	});

	describe('GRADO_ORDEN_MAP', () => {
		it('cubre los 14 grados del maestro (Inicial + Primaria + Secundaria)', () => {
			expect(Object.keys(GRADO_ORDEN_MAP)).toHaveLength(14);
		});

		it('mapea correctamente los grados del umbral (5to Primaria = 8)', () => {
			expect(GRADO_ORDEN_MAP['5to Primaria']).toBe(8);
			expect(GRADO_ORDEN_MAP['4to Primaria']).toBe(7);
		});

		it('mapea correctamente los bordes (1ro Inicial = 1, 5to Secundaria = 14)', () => {
			expect(GRADO_ORDEN_MAP['1ro Inicial']).toBe(1);
			expect(GRADO_ORDEN_MAP['5to Secundaria']).toBe(14);
		});
	});

	describe('resolverGraOrden', () => {
		it('retorna el orden para un nombre canónico conocido', () => {
			expect(resolverGraOrden('3ro Primaria')).toBe(6);
		});

		it('retorna null para nombre desconocido (no asume alcance)', () => {
			expect(resolverGraOrden('Kinder')).toBeNull();
		});

		it('retorna null para null/undefined/empty', () => {
			expect(resolverGraOrden(null)).toBeNull();
			expect(resolverGraOrden(undefined)).toBeNull();
			expect(resolverGraOrden('')).toBeNull();
		});
	});

	describe('esGradoAsistenciaDiaria', () => {
		it('true para orden numérico >= 8 (5to Primaria)', () => {
			expect(esGradoAsistenciaDiaria(8)).toBe(true);
			expect(esGradoAsistenciaDiaria(14)).toBe(true);
		});

		it('false para orden numérico < 8 (menor que 5to Primaria)', () => {
			expect(esGradoAsistenciaDiaria(7)).toBe(false);
			expect(esGradoAsistenciaDiaria(1)).toBe(false);
		});

		it('acepta nombre canónico y resuelve el orden', () => {
			expect(esGradoAsistenciaDiaria('5to Primaria')).toBe(true);
			expect(esGradoAsistenciaDiaria('4to Primaria')).toBe(false);
			expect(esGradoAsistenciaDiaria('1ro Secundaria')).toBe(true);
		});

		it('false defensivo para null/undefined/desconocido', () => {
			expect(esGradoAsistenciaDiaria(null)).toBe(false);
			expect(esGradoAsistenciaDiaria(undefined)).toBe(false);
			expect(esGradoAsistenciaDiaria('Kinder')).toBe(false);
		});
	});
});
