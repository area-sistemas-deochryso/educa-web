// * Tests for AsistenciaCursoFacade — validates attendance orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { AsistenciaCursoFacade } from './asistencia-curso.facade';
import { AsistenciaCursoStore } from './asistencia-curso.store';
import { CursoContenidoStore } from './curso-contenido.store';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { ErrorHandlerService } from '@core/services';

// #endregion

// #region Mocks
const mockRegistroData = {
	fecha: '2026-03-21',
	horarioId: 1,
	estudiantes: [
		{ estudianteId: 1, nombre: 'Juan', estado: 'P', justificacion: null },
		{ estudianteId: 2, nombre: 'María', estado: 'F', justificacion: 'Enfermedad' },
	],
};

function createMockApi() {
	return {
		getAsistenciaCursoFecha: vi.fn().mockReturnValue(of(mockRegistroData)),
		getAsistenciaCursoResumen: vi.fn().mockReturnValue(of({ totalClases: 20 })),
		registrarAsistenciaCurso: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
	};
}
// #endregion

// #region Tests
describe('AsistenciaCursoFacade', () => {
	let facade: AsistenciaCursoFacade;
	let store: AsistenciaCursoStore;
	let contenidoStore: CursoContenidoStore;
	let api: ReturnType<typeof createMockApi>;
	let errorHandler: { showError: ReturnType<typeof vi.fn>; showSuccess: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = createMockApi();
		errorHandler = { showError: vi.fn(), showSuccess: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				AsistenciaCursoFacade,
				AsistenciaCursoStore,
				CursoContenidoStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});

		facade = TestBed.inject(AsistenciaCursoFacade);
		store = TestBed.inject(AsistenciaCursoStore);
		contenidoStore = TestBed.inject(CursoContenidoStore);
		store.reset();
		contenidoStore.reset();
	});

	// #region loadRegistro
	describe('loadRegistro', () => {
		it('should load registro with override horarioId', () => {
			facade.loadRegistro('2026-03-21', 5);

			expect(api.getAsistenciaCursoFecha).toHaveBeenCalledWith(5, '2026-03-21');
			expect(store.registroLoading()).toBe(false);
			expect(store.registroData()).toEqual(mockRegistroData);
		});

		it('should use contenido horarioId when no override', () => {
			contenidoStore.setContenido({ horarioId: 10 } as never);
			facade.loadRegistro('2026-03-21');

			expect(api.getAsistenciaCursoFecha).toHaveBeenCalledWith(10, '2026-03-21');
		});

		it('should do nothing without horarioId', () => {
			facade.loadRegistro('2026-03-21');
			expect(api.getAsistenciaCursoFecha).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region loadResumen
	describe('loadResumen', () => {
		it('should load resumen', () => {
			facade.loadResumen('2026-03-01', '2026-03-31', 5);

			expect(api.getAsistenciaCursoResumen).toHaveBeenCalledWith(5, '2026-03-01', '2026-03-31');
			expect(store.resumenLoading()).toBe(false);
		});

		it('should do nothing without horarioId', () => {
			facade.loadResumen('2026-03-01', '2026-03-31');
			expect(api.getAsistenciaCursoResumen).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region registrar
	describe('registrar', () => {
		it('should register attendance', () => {
			store.setRegistroData(mockRegistroData as never);
			facade.registrar(1);

			expect(api.registrarAsistenciaCurso).toHaveBeenCalledWith(1, expect.objectContaining({
				fecha: '2026-03-21',
				asistencias: expect.arrayContaining([
					expect.objectContaining({ estudianteId: 1, estado: 'P', justificacion: null }),
					expect.objectContaining({ estudianteId: 2, estado: 'F', justificacion: 'Enfermedad' }),
				]),
			}));
			expect(store.registroSaving()).toBe(false);
			expect(errorHandler.showSuccess).toHaveBeenCalled();
		});

		it('should do nothing without data', () => {
			facade.registrar(1);
			expect(api.registrarAsistenciaCurso).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region State delegation
	describe('state delegation', () => {
		it('should delegate setEstudianteEstado', () => {
			store.setRegistroData(mockRegistroData as never);
			facade.setEstudianteEstado(1, 'F');

			const est = store.registroEstudiantes() as unknown as { estudianteId: number; estado: string }[];
			expect(est.find((e) => e.estudianteId === 1)?.estado).toBe('F');
		});

		it('should delegate setEstudianteJustificacion', () => {
			store.setRegistroData(mockRegistroData as never);
			facade.setEstudianteJustificacion(1, 'Motivo');

			const est = store.registroEstudiantes() as unknown as { estudianteId: number; justificacion: string | null }[];
			expect(est.find((e) => e.estudianteId === 1)?.justificacion).toBe('Motivo');
		});

		it('should reset asistencia', () => {
			store.setRegistroData(mockRegistroData as never);
			facade.resetAsistencia();
			expect(store.registroData()).toBeNull();
		});
	});
	// #endregion
});
// #endregion
