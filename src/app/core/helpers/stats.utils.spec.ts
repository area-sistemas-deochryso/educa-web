// * Tests para getEstadoToggleDeltas / getEstadoRollbackDeltas — patrón optimistic CRUD.
import { describe, expect, it } from 'vitest';

import { getEstadoToggleDeltas, getEstadoRollbackDeltas } from './stats.utils';

describe('getEstadoToggleDeltas', () => {
	describe('toggle (default)', () => {
		it('activo→inactivo: activos -1, inactivos +1', () => {
			expect(getEstadoToggleDeltas(true)).toEqual({ activosDelta: -1, inactivosDelta: 1 });
		});

		it('inactivo→activo: activos +1, inactivos -1', () => {
			expect(getEstadoToggleDeltas(false)).toEqual({ activosDelta: 1, inactivosDelta: -1 });
		});
	});

	describe('delete-soft (baja lógica, alineado con INV-D03)', () => {
		it('activo soft-deleted: activos -1, inactivos +1 (transición a inactivo)', () => {
			expect(getEstadoToggleDeltas(true, 'delete-soft')).toEqual({
				activosDelta: -1,
				inactivosDelta: 1,
			});
		});

		it('inactivo soft-deleted: no cambia (ya estaba inactivo)', () => {
			expect(getEstadoToggleDeltas(false, 'delete-soft')).toEqual({
				activosDelta: 0,
				inactivosDelta: 0,
			});
		});
	});

	describe('delete-hard (baja física)', () => {
		it('activo hard-deleted: activos -1, inactivos sin cambio', () => {
			expect(getEstadoToggleDeltas(true, 'delete-hard')).toEqual({
				activosDelta: -1,
				inactivosDelta: 0,
			});
		});

		it('inactivo hard-deleted: inactivos -1', () => {
			expect(getEstadoToggleDeltas(false, 'delete-hard')).toEqual({
				activosDelta: 0,
				inactivosDelta: -1,
			});
		});
	});

	describe('delete (alias de delete-hard, compat)', () => {
		it('activo: equivale a delete-hard', () => {
			expect(getEstadoToggleDeltas(true, 'delete')).toEqual({
				activosDelta: -1,
				inactivosDelta: 0,
			});
		});

		it('inactivo: equivale a delete-hard', () => {
			expect(getEstadoToggleDeltas(false, 'delete')).toEqual({
				activosDelta: 0,
				inactivosDelta: -1,
			});
		});
	});
});

describe('getEstadoRollbackDeltas', () => {
	it('rollback de toggle activo→inactivo restaura: activos +1, inactivos -1', () => {
		expect(getEstadoRollbackDeltas(true)).toEqual({ activosDelta: 1, inactivosDelta: -1 });
	});

	it('rollback de delete-soft activo restaura: activos +1, inactivos -1', () => {
		expect(getEstadoRollbackDeltas(true, 'delete-soft')).toEqual({
			activosDelta: 1,
			inactivosDelta: -1,
		});
	});

	it('rollback de delete-hard activo restaura: activos +1', () => {
		expect(getEstadoRollbackDeltas(true, 'delete-hard')).toEqual({
			activosDelta: 1,
			inactivosDelta: 0,
		});
	});
});
