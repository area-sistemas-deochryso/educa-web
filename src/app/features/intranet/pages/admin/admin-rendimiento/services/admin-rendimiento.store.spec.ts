// * Tests for AdminRendimientoStore — validates institutional rendimiento state,
// * including the outlier-based sort/highlight that is the differential value of the panel.
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AdminRendimientoStore } from './admin-rendimiento.store';
import { ReporteRendimientoDto } from '../models';

const cursoEstable: ReporteRendimientoDto = {
	cursoContenidoId: 1,
	cursoNombre: 'Matemática',
	salonDescripcion: '1ro A',
	periodos: [
		{
			periodoId: 1,
			periodoNombre: 'Periodo 1',
			periodoOrden: 1,
			promedioCurso: 14,
			totalEstudiantesConNota: 20,
			outlierVsPeriodoAnterior: null,
			outlierVsAnioAnterior: 0.5,
		},
	],
};

const cursoConOutlierFuerte: ReporteRendimientoDto = {
	cursoContenidoId: 2,
	cursoNombre: 'Comunicación',
	salonDescripcion: '2do B',
	periodos: [
		{
			periodoId: 1,
			periodoNombre: 'Periodo 1',
			periodoOrden: 1,
			promedioCurso: 10,
			totalEstudiantesConNota: 18,
			outlierVsPeriodoAnterior: -4.2,
			outlierVsAnioAnterior: null,
		},
	],
};

const cursoSinDatos: ReporteRendimientoDto = {
	cursoContenidoId: 3,
	cursoNombre: 'Arte',
	salonDescripcion: '3ro C',
	periodos: [],
};

describe('AdminRendimientoStore', () => {
	let store: AdminRendimientoStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [AdminRendimientoStore] });
		store = TestBed.inject(AdminRendimientoStore);
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
			store.setCursos([cursoEstable]);

			expect(store.cursos()).toEqual([cursoEstable]);
			expect(store.vm().isEmpty).toBe(false);
		});

		it('should sort cursosOrdenados by outlier magnitude, biggest deviation first', () => {
			store.setCursos([cursoEstable, cursoConOutlierFuerte, cursoSinDatos]);

			const orden = store.cursosOrdenados().map((c) => c.cursoContenidoId);
			expect(orden).toEqual([2, 1, 3]);
		});

		it('should compute kpis: totalCursos, cursosConOutlier, promedioInstitucional', () => {
			store.setCursos([cursoEstable, cursoConOutlierFuerte, cursoSinDatos]);

			const kpis = store.kpis();
			expect(kpis.totalCursos).toBe(3);
			expect(kpis.cursosConOutlier).toBe(2);
			expect(kpis.promedioInstitucional).toBe(12);
		});
	});

	describe('setLoading / setError', () => {
		it('should track loading and error flags independently of cursos', () => {
			store.setLoading(true);
			expect(store.vm().loading).toBe(true);

			store.setError('No se pudo cargar el rendimiento institucional');
			expect(store.vm().error).toBe('No se pudo cargar el rendimiento institucional');
		});
	});

	describe('reset', () => {
		it('should restore initial state', () => {
			store.setCursos([cursoEstable]);
			store.setLoading(true);
			store.setError('boom');

			store.reset();

			expect(store.cursos()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
		});
	});
});
