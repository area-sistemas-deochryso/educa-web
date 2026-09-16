// * Tests for ProfesorFacade — validates professor data loading and dialog orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { ProfesorFacade } from './profesor.facade';
import { ProfesorStore, ProfesorSalonConEstudiantes } from './profesor.store';
import { ErrorHandlerService, WalFacadeHelper, WalCrossTabRefetchService } from '@core/services';
import { ProfesorApiService } from './profesor-api.service';
import { UserProfileService } from '@core/services/user';
import { ViewAsContextService } from '@core/services/view-as';
import { SmartNotificationService } from '@core/services/notifications';

// #endregion

// #region Mocks
const mockHorarios = [
	{ id: 1, cursoId: 10, cursoNombre: 'Mat', salonId: 100, salonDescripcion: '1A', diaSemana: 1, diaSemanaDescripcion: 'Lunes', horaInicio: '08:00', horaFin: '09:30', profesorId: 1 },
] as never[];

const mockSalonTutoria = { data: { salonId: 100, grado: '1ro', seccion: 'A' } };
const mockEstudiantes = { salones: [] };

function createMockApi() {
	return {
		getHorarios: vi.fn().mockReturnValue(of(mockHorarios)),
		getSalonTutoria: vi.fn().mockReturnValue(of(mockSalonTutoria)),
		getMisEstudiantes: vi.fn().mockReturnValue(of(mockEstudiantes)),
		getEstudiantesSalon: vi.fn().mockReturnValue(of({ cantidadEstudiantes: 30, estudiantes: [] })),
		getNotasSalon: vi.fn().mockReturnValue(of({ estudiantes: [] })),
		calificarLote: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		eliminarNotaEstudiante: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
	};
}

function createMockUserProfile() {
	return { entityId: vi.fn().mockReturnValue(1) };
}

function createMockViewAsContext(active: { entityId: number; rol: string } | null = null) {
	return {
		hasContextForRol: vi.fn().mockImplementation((rol: string) => active?.rol === rol),
		activeContext: vi.fn().mockReturnValue(active),
	};
}

function createMockSmartNotif() {
	return { saveHorarioSnapshot: vi.fn(), saveCalificacionSnapshot: vi.fn(), saveActividadSnapshot: vi.fn() };
}

function createMockWal() {
	return {
		execute: vi.fn((config: { onCommit?: (data?: never) => void; optimistic?: { apply: () => void } }) => {
			config.optimistic?.apply();
		}),
	};
}
// #endregion

// #region Tests
describe('ProfesorFacade', () => {
	let facade: ProfesorFacade;
	let store: ProfesorStore;
	let api: ReturnType<typeof createMockApi>;
	let errorHandler: { showError: ReturnType<typeof vi.fn> };
	let wal: ReturnType<typeof createMockWal>;

	beforeEach(() => {
		api = createMockApi();
		errorHandler = { showError: vi.fn(), showSuccess: vi.fn() } as never;
		wal = createMockWal();

		TestBed.configureTestingModule({
			providers: [
				ProfesorFacade,
				ProfesorStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: UserProfileService, useValue: createMockUserProfile() },
				{ provide: ViewAsContextService, useValue: createMockViewAsContext() },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: SmartNotificationService, useValue: createMockSmartNotif() },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
			],
		});

		facade = TestBed.inject(ProfesorFacade);
		store = TestBed.inject(ProfesorStore);
		store.reset();
	});

	// #region loadData
	describe('loadData', () => {
		it('should load horarios, tutoria, and estudiantes', () => {
			facade.loadData();

			expect(store.horarios()).toEqual(mockHorarios);
			expect(store.loading()).toBe(false);
		});

		it('should call API with profesorId', () => {
			facade.loadData();
			expect(api.getHorarios).toHaveBeenCalledWith(1);
			expect(api.getSalonTutoria).toHaveBeenCalledWith(1);
		});
	});
	// #endregion

	// #region loadData -- "ver como" (P92 F2)
	describe('loadData with active "ver como" context', () => {
		it('should use the view-as entityId when a Profesor context is active', () => {
			const viewAsApi = createMockApi();
			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					ProfesorFacade,
					ProfesorStore,
					{ provide: ProfesorApiService, useValue: viewAsApi },
					{ provide: UserProfileService, useValue: createMockUserProfile() },
					{
						provide: ViewAsContextService,
						useValue: createMockViewAsContext({ entityId: 99, rol: 'Profesor' }),
					},
					{ provide: ErrorHandlerService, useValue: errorHandler },
					{ provide: SmartNotificationService, useValue: createMockSmartNotif() },
				],
			});

			const viewAsFacade = TestBed.inject(ProfesorFacade);
			viewAsFacade.loadData();

			expect(viewAsApi.getHorarios).toHaveBeenCalledWith(99);
			expect(viewAsApi.getSalonTutoria).toHaveBeenCalledWith(99);
		});

		it('should ignore an active context for a different rol (Estudiante)', () => {
			const otherRolApi = createMockApi();
			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					ProfesorFacade,
					ProfesorStore,
					{ provide: ProfesorApiService, useValue: otherRolApi },
					{ provide: UserProfileService, useValue: createMockUserProfile() },
					{
						provide: ViewAsContextService,
						useValue: createMockViewAsContext({ entityId: 99, rol: 'Estudiante' }),
					},
					{ provide: ErrorHandlerService, useValue: errorHandler },
					{ provide: SmartNotificationService, useValue: createMockSmartNotif() },
				],
			});

			const otherRolFacade = TestBed.inject(ProfesorFacade);
			otherRolFacade.loadData();

			expect(otherRolApi.getHorarios).toHaveBeenCalledWith(1);
			expect(otherRolApi.getSalonTutoria).toHaveBeenCalledWith(1);
		});
	});
	// #endregion

	// #region Dialog commands
	describe('dialog commands', () => {
		const mockSalon: ProfesorSalonConEstudiantes = {
			salonId: 100, salonDescripcion: '1A', cursos: [], esTutor: false,
			cantidadEstudiantes: 0, estudiantes: [],
		};

		it('should open salon dialog and load estudiantes', () => {
			facade.openSalonDialog(mockSalon);

			expect(store.salonDialogVisible()).toBe(true);
			expect(api.getEstudiantesSalon).toHaveBeenCalledWith(100);
		});

		it('should skip if already loading', () => {
			store.openSalonDialog(mockSalon);

			facade.openSalonDialog(mockSalon);
			expect(api.getEstudiantesSalon).not.toHaveBeenCalled();
		});

		it('should close salon dialog', () => {
			facade.openSalonDialog(mockSalon);
			facade.closeSalonDialog();

			expect(store.salonDialogVisible()).toBe(false);
			expect(store.selectedSalon()).toBeNull();
		});
	});
	// #endregion

	// #region Notas commands
	describe('notas commands', () => {
		it('should set notas vista', () => {
			facade.setNotasVista('periodo');
			expect(store.notasVistaActual()).toBe('periodo');
		});
	});
	// #endregion

	// #region saveNotaSalon
	describe('saveNotaSalon', () => {
		const mockSalon: ProfesorSalonConEstudiantes = {
			salonId: 100, salonDescripcion: '1A', cursos: [], esTutor: false,
			cantidadEstudiantes: 0, estudiantes: [],
		};

		beforeEach(() => {
			store.openSalonDialog(mockSalon);
			store.setNotasCursoId(10);
			store.setNotasSalon({
				evaluaciones: [],
				periodos: [],
				estudiantes: [{ estudianteId: 200, estudianteNombre: 'Ana', notas: [] }],
			} as never);
		});

		it('should call WAL execute with calificarLote payload when nota is provided', () => {
			facade.saveNotaSalon(5, 200, 17);

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'UPDATE',
					resourceType: 'calificacionSalon',
					resourceId: 5,
					method: 'POST',
					payload: { notas: [{ estudianteId: 200, nota: 17, observacion: null }] },
				}),
			);
			expect(store.getNotaEstudiante(200, 5)).toBe(17);
		});

		it('should call WAL execute with DELETE when nota is null', () => {
			facade.saveNotaSalon(5, 200, null);

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'DELETE',
					resourceType: 'calificacionSalon',
					resourceId: 5,
					method: 'DELETE',
					payload: null,
				}),
			);
			expect(store.getNotaEstudiante(200, 5)).toBeNull();
		});

		it('should rollback to the previous nota on error', () => {
			store.updateNotaEstudiante(200, 5, 12);
			wal.execute.mockImplementationOnce((config: { onError?: (err: unknown) => void; optimistic?: { apply: () => void; rollback: () => void } }) => {
				config.optimistic?.apply();
				config.optimistic?.rollback();
				config.onError?.(new Error('fail'));
			});

			facade.saveNotaSalon(5, 200, 18);

			expect(store.getNotaEstudiante(200, 5)).toBe(12);
			expect(errorHandler.showError).toHaveBeenCalled();
		});

		it('should not call WAL execute without selectedSalon or notasCursoId', () => {
			facade.closeSalonDialog();

			facade.saveNotaSalon(5, 200, 17);

			expect(wal.execute).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region vm
	describe('vm', () => {
		it('should expose store vm', () => {
			expect(facade.vm).toBe(store.vm);
		});
	});
	// #endregion
});
// #endregion
