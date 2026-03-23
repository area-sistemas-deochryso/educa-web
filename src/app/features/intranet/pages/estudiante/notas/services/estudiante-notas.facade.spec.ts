// * Tests for EstudianteNotasFacade — validates grade loading and simulator delegation.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { EstudianteNotasFacade } from './estudiante-notas.facade';
import { EstudianteNotasStore } from './estudiante-notas.store';
import { EstudianteMisNotasDto } from '../../models';
import { EstudianteApiService } from '../../services/estudiante-api.service';
import { SmartNotificationService } from '@core/services/notifications/smart-notification.service';

// #endregion

// #region Mocks
const mockCursos = [
	{
		cursoNombre: 'Matemática', salonDescripcion: '1A',
		evaluaciones: [
			{ id: 1, titulo: 'Examen 1', tipo: 'examen', nota: 16, peso: 30, fechaEvaluacion: null },
			{ id: 2, titulo: 'Tarea 1', tipo: 'tarea', nota: 14, peso: 20, fechaEvaluacion: '2026-04-01' },
		],
		promedios: { general: 15, semana: 15, periodo: 15 },
	},
] as unknown as EstudianteMisNotasDto[];

function createMockApi() {
	return { getMisNotas: vi.fn().mockReturnValue(of(mockCursos)) };
}

function createMockSmartNotif() {
	return {
		saveCalificacionSnapshot: vi.fn(),
		saveActividadSnapshot: vi.fn(),
		saveHorarioSnapshot: vi.fn(),
	};
}
// #endregion

// #region Tests
describe('EstudianteNotasFacade', () => {
	let facade: EstudianteNotasFacade;
	let store: EstudianteNotasStore;
	let api: ReturnType<typeof createMockApi>;
	let smartNotif: ReturnType<typeof createMockSmartNotif>;

	beforeEach(() => {
		api = createMockApi();
		smartNotif = createMockSmartNotif();

		TestBed.configureTestingModule({
			providers: [
				EstudianteNotasFacade,
				EstudianteNotasStore,
				{ provide: EstudianteApiService, useValue: api },
				{ provide: SmartNotificationService, useValue: smartNotif },
			],
		});

		facade = TestBed.inject(EstudianteNotasFacade);
		store = TestBed.inject(EstudianteNotasStore);
		store.reset();
	});

	// #region loadNotas
	describe('loadNotas', () => {
		it('should load cursos into store', () => {
			facade.loadNotas();

			expect(store.cursos()).toEqual(mockCursos);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
		});

		it('should save smart notification snapshots', () => {
			facade.loadNotas();

			expect(smartNotif.saveCalificacionSnapshot).toHaveBeenCalled();
			expect(smartNotif.saveActividadSnapshot).toHaveBeenCalled();
		});

		it('should call API on load', () => {
			facade.loadNotas();
			expect(api.getMisNotas).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region UI delegation
	describe('UI delegation', () => {
		it('should select curso', () => {
			facade.selectCurso(1);
			expect(store.selectedCursoIndex()).toBe(1);
		});

		it('should set vista', () => {
			facade.setVista('periodo');
			expect(store.vistaActual()).toBe('periodo');
		});
	});
	// #endregion

	// #region Simulador delegation
	describe('simulador delegation', () => {
		beforeEach(() => {
			store.setCursos(mockCursos);
		});

		it('should open simulador', () => {
			facade.openSimulador();
			expect(store.simuladorVisible()).toBe(true);
		});

		it('should close simulador', () => {
			facade.openSimulador();
			facade.closeSimulador();
			expect(store.simuladorVisible()).toBe(false);
		});

		it('should update simulacion for selected curso', () => {
			facade.openSimulador();
			facade.updateSimulacion(1, 20);

			const sims = store.simulaciones()['Matemática'];
			expect(sims[0].notaSimulada).toBe(20);
		});

		it('should reset simulacion for selected curso', () => {
			facade.openSimulador();
			facade.updateSimulacion(1, 20);
			facade.resetSimulacion();

			const sims = store.simulaciones()['Matemática'];
			expect(sims[0].notaSimulada).toBe(16);
		});

		it('should do nothing without selected curso', () => {
			store.setSelectedCursoIndex(99);
			facade.updateSimulacion(1, 20);
			expect(store.simulaciones()).toEqual({});
		});
	});
	// #endregion
});
// #endregion
