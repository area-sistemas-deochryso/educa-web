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
		sinPeriodosConfigurados: false,
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

	describe('vm.cursos (escala y puntos calificados)', () => {
		it('counts periods with an average and defaults the scale to null (numeric axis)', () => {
			store.setCursos(mockCursos);

			expect(store.vm().cursos[0].puntosCalificados).toBe(2);
			expect(store.vm().cursos[0].escala).toBeNull();
		});

		it('flags a course with a single graded period (no line chart)', () => {
			store.setCursos([
				{
					...mockCursos[0],
					periodos: [
						mockCursos[0].periodos[0],
						{ ...mockCursos[0].periodos[1], promedio: null, outlierVsPeriodoAnterior: null },
					],
				},
			]);

			expect(store.vm().cursos[0].puntosCalificados).toBe(1);
		});

		it('attaches the scale of the course by cursoContenidoId', () => {
			const escala = { id: 9, tipoCalificacion: 'LITERAL', literales: [] } as never;
			store.setCursos(mockCursos);
			store.setEscalas({ 1: escala });

			expect(store.vm().cursos[0].escala).toBe(escala);
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
