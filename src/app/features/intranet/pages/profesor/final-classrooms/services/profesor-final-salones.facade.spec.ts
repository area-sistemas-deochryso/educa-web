// * Tests for TeacherFinalClassroomsFacade — validates final grades orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { TeacherFinalClassroomsFacade } from './profesor-final-salones.facade';
import { TeacherFinalClassroomsStore } from './profesor-final-salones.store';
import { TeacherFinalClassroomsApiService } from './profesor-final-salones-api.service';
import { ErrorHandlerService } from '@core/services';

// #endregion

// #region Mocks
const mockSalones = [
	{ id: 1, gradoOrden: 1, totalEstudiantes: 25, aprobados: 20, desaprobados: 3, pendientes: 2 },
	{ id: 2, gradoOrden: 5, totalEstudiantes: 30, aprobados: 25, desaprobados: 3, pendientes: 2 },
] as never[];

function createMockApi() {
	return {
		getSalonesProfesor: vi.fn().mockReturnValue(of(mockSalones)),
		getPeriodosPorAnio: vi.fn().mockReturnValue(of([])),
		getConfiguracionesPorAnio: vi.fn().mockReturnValue(of([])),
		getEstudiantesPorSalon: vi.fn().mockReturnValue(of([])),
		aprobarEstudiante: vi.fn().mockReturnValue(of(true)),
		aprobacionMasiva: vi.fn().mockReturnValue(of({ aprobados: 5 })),
	};
}
// #endregion

// #region Tests
describe('TeacherFinalClassroomsFacade', () => {
	let facade: TeacherFinalClassroomsFacade;
	let store: TeacherFinalClassroomsStore;
	let api: ReturnType<typeof createMockApi>;

	beforeEach(() => {
		api = createMockApi();

		TestBed.configureTestingModule({
			providers: [
				TeacherFinalClassroomsFacade,
				TeacherFinalClassroomsStore,
				{ provide: TeacherFinalClassroomsApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
			],
		});

		facade = TestBed.inject(TeacherFinalClassroomsFacade);
		store = TestBed.inject(TeacherFinalClassroomsStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load salones, periodos, and configs', () => {
			facade.loadAll();

			expect(store.salones()).toEqual(mockSalones);
			expect(store.loading()).toBe(false);
			expect(store.tableReady()).toBe(true);
			expect(store.statsReady()).toBe(true);
		});
	});
	// #endregion

	// #region UI commands
	describe('UI commands', () => {
		it('should expose store vm', () => {
			expect(facade.vm).toBe(store.vm);
		});
	});
	// #endregion
});
// #endregion
