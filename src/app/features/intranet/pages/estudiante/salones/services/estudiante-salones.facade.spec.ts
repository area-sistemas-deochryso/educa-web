// * Tests for EstudianteSalonesFacade — validates student salon data loading.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { EstudianteSalonesFacade } from './estudiante-salones.facade';
import { EstudianteSalonesStore } from './estudiante-salones.store';
import { ErrorHandlerService } from '@core/services';
import { EstudianteApiService } from '../../services/estudiante-api.service';

// #endregion

// #region Mocks
const mockHorarios = [
	{ id: 1, salonId: 100, cursoId: 10, cursoNombre: 'Mat', salonDescripcion: '1A', cantidadEstudiantes: 30 },
] as never[];

const mockNotas = [{ cursoNombre: 'Mat', promedios: { general: 15 } }] as never[];

function createMockApi() {
	return {
		getMisHorarios: vi.fn().mockReturnValue(of(mockHorarios)),
		getMisNotas: vi.fn().mockReturnValue(of(mockNotas)),
		getMiAsistencia: vi.fn().mockReturnValue(of({ totalClases: 20, asistencias: 18 })),
		getGruposHorario: vi.fn().mockReturnValue(of({ grupos: [] })),
	};
}
// #endregion

// #region Tests
describe('EstudianteSalonesFacade', () => {
	let facade: EstudianteSalonesFacade;
	let store: EstudianteSalonesStore;
	let api: ReturnType<typeof createMockApi>;

	beforeEach(() => {
		api = createMockApi();

		TestBed.configureTestingModule({
			providers: [
				EstudianteSalonesFacade,
				EstudianteSalonesStore,
				{ provide: EstudianteApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn() } },
			],
		});

		// Manual inject since the service name doesn't match the token
		store = TestBed.inject(EstudianteSalonesStore);
		facade = TestBed.inject(EstudianteSalonesFacade);
	});

	// #region loadData
	describe('loadData', () => {
		it('should load horarios and notas into store', () => {
			facade.loadData();

			expect(store.loading()).toBe(false);
			expect(store.notasData()).toEqual(mockNotas);
		});

		it('should handle error', () => {
			api.getMisHorarios.mockReturnValue(throwError(() => new Error('fail')));
			facade.loadData();

			expect(store.error()).toBeTruthy();
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion

	// #region UI commands
	describe('UI commands', () => {
		it('should open dialog', () => {
			facade.openDialog(100);
			expect(store.dialogVisible()).toBe(true);
		});

		it('should close dialog', () => {
			facade.openDialog(100);
			facade.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region loadAsistencia
	describe('loadAsistencia', () => {
		it('should load asistencia and set cursoId', () => {
			facade.loadAsistencia(10);

			expect(store.asistenciaCursoId()).toBe(10);
			expect(store.asistenciaLoading()).toBe(false);
		});

		it('should skip if already loading', () => {
			store.setAsistenciaLoading(true);
			facade.loadAsistencia(10);

			expect(api.getMiAsistencia).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region loadGrupos
	describe('loadGrupos', () => {
		it('should load grupos and set cursoId', () => {
			facade.loadGrupos(10);

			expect(store.gruposCursoId()).toBe(10);
			expect(store.gruposLoading()).toBe(false);
		});

		it('should skip if already loading', () => {
			store.setGruposLoading(true);
			facade.loadGrupos(10);

			expect(api.getGruposHorario).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region refreshNotas
	describe('refreshNotas', () => {
		it('should refresh notas data', () => {
			facade.refreshNotas();
			expect(store.notasLoading()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
