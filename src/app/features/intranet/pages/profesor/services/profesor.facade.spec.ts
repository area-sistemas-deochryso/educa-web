// * Tests for ProfesorFacade — validates professor data loading and dialog orchestration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { ProfesorFacade } from './profesor.facade';
import { ProfesorStore, ProfesorSalonConEstudiantes } from './profesor.store';
import { ErrorHandlerService } from '@core/services';
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
// #endregion

// #region Tests
describe('ProfesorFacade', () => {
	let facade: ProfesorFacade;
	let store: ProfesorStore;
	let api: ReturnType<typeof createMockApi>;
	let errorHandler: { showError: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = createMockApi();
		errorHandler = { showError: vi.fn(), showSuccess: vi.fn() } as never;

		TestBed.configureTestingModule({
			providers: [
				ProfesorFacade,
				ProfesorStore,
				{ provide: ProfesorApiService, useValue: api },
				{ provide: UserProfileService, useValue: createMockUserProfile() },
				{ provide: ViewAsContextService, useValue: createMockViewAsContext() },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: SmartNotificationService, useValue: createMockSmartNotif() },
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

	// #region vm
	describe('vm', () => {
		it('should expose store vm', () => {
			expect(facade.vm).toBe(store.vm);
		});
	});
	// #endregion
});
// #endregion
