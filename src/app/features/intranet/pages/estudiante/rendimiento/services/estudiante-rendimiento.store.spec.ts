// * Tests for EstudianteRendimientoStore — validates rendimiento propio state.
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EstudianteRendimientoStore } from './estudiante-rendimiento.store';
import { RendimientoPropioCursoDto } from './estudiante-rendimiento.models';

const mockCursos: RendimientoPropioCursoDto[] = [
	{
		cursoContenidoId: 1,
		cursoNombre: 'Matemática',
		anio: 2026,
		periodos: [
			{ periodoId: 1, periodoNombre: 'Periodo 1', periodoOrden: 1, promedio: 14, outlierVsPeriodoAnterior: null, outlierVsAnioAnterior: 3 },
			{ periodoId: 2, periodoNombre: 'Periodo 2', periodoOrden: 2, promedio: 16, outlierVsPeriodoAnterior: 2, outlierVsAnioAnterior: 5 },
		],
	},
];

describe('EstudianteRendimientoStore', () => {
	let store: EstudianteRendimientoStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [EstudianteRendimientoStore] });
		store = TestBed.inject(EstudianteRendimientoStore);
		store.reset();
	});

	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.cursos()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
			expect(store.vm().isEmpty).toBe(true);
		});
	});

	describe('setCursos', () => {
		it('should populate cursos and clear isEmpty', () => {
			store.setCursos(mockCursos);

			expect(store.cursos()).toEqual(mockCursos);
			expect(store.vm().isEmpty).toBe(false);
		});
	});

	describe('setLoading / setError', () => {
		it('should track loading and error flags independently of cursos', () => {
			store.setLoading(true);
			expect(store.vm().loading).toBe(true);

			store.setError('No se pudo cargar tu rendimiento académico');
			expect(store.vm().error).toBe('No se pudo cargar tu rendimiento académico');
		});
	});

	describe('reset', () => {
		it('should restore initial state', () => {
			store.setCursos(mockCursos);
			store.setLoading(true);
			store.setError('boom');

			store.reset();

			expect(store.cursos()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
		});
	});
});
