// * Tests for StudentClassroomsFacade — validates student salon data loading.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError, firstValueFrom } from 'rxjs';

import { StudentClassroomsFacade } from './estudiante-salones.facade';
import { StudentClassroomsStore } from './estudiante-salones.store';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
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
		getMisSolicitudes: vi.fn().mockReturnValue(of([])),
		crearSolicitudJustificacion: vi.fn().mockReturnValue(of({ id: 1 })),
	};
}

function createMockWal() {
	return {
		execute: vi.fn().mockImplementation(async (config: Record<string, unknown>) => {
			const http$ = config['http$'] as () => import('rxjs').Observable<unknown>;
			const onCommit = config['onCommit'] as ((r: unknown) => void) | undefined;
			const onError = config['onError'] as ((e: unknown) => void) | undefined;
			try {
				const result = await firstValueFrom(http$());
				onCommit?.(result);
			} catch (err) {
				onError?.(err);
			}
		}),
	};
}
// #endregion

// #region Tests
describe('StudentClassroomsFacade', () => {
	let facade: StudentClassroomsFacade;
	let store: StudentClassroomsStore;
	let api: ReturnType<typeof createMockApi>;

	beforeEach(() => {
		api = createMockApi();

		TestBed.configureTestingModule({
			providers: [
				StudentClassroomsFacade,
				StudentClassroomsStore,
				{ provide: EstudianteApiService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: createMockWal() },
			],
		});

		// Manual inject since the service name doesn't match the token
		store = TestBed.inject(StudentClassroomsStore);
		facade = TestBed.inject(StudentClassroomsFacade);
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

	// #region loadData — solicitudes
	describe('loadData — solicitudes', () => {
		it('should load solicitudes into store', () => {
			const mockSolicitudes = [{ id: 1, asistenciaCursoId: 5, estado: 'PENDIENTE' }] as never[];
			api.getMisSolicitudes.mockReturnValue(of(mockSolicitudes));

			facade.loadData();

			expect(store.solicitudes()).toEqual(mockSolicitudes);
		});
	});
	// #endregion

	// #region Solicitudes de justificación
	describe('justificar dialog', () => {
		it('should open with context', () => {
			const context = { asistenciaCursoId: 5, fecha: '2026-08-10', motivoRechazoAnterior: null };
			facade.openJustificarDialog(context);

			expect(store.justificarDialogVisible()).toBe(true);
			expect(store.justificarContext()).toEqual(context);
		});

		it('should close and clear context', () => {
			facade.openJustificarDialog({ asistenciaCursoId: 5, fecha: '2026-08-10', motivoRechazoAnterior: null });
			facade.closeJustificarDialog();

			expect(store.justificarDialogVisible()).toBe(false);
			expect(store.justificarContext()).toBeNull();
		});
	});

	describe('crearSolicitudJustificacion', () => {
		it('should add solicitud and close dialog on success', async () => {
			const nuevaSolicitud = { id: 99, asistenciaCursoId: 5, estado: 'PENDIENTE' } as never;
			api.crearSolicitudJustificacion.mockReturnValue(of(nuevaSolicitud));
			facade.openJustificarDialog({ asistenciaCursoId: 5, fecha: '2026-08-10', motivoRechazoAnterior: null });

			facade.crearSolicitudJustificacion(new FormData());

			await vi.waitFor(() => {
				expect(store.solicitudes()).toContainEqual(nuevaSolicitud);
			});
			expect(store.solicitudSaving()).toBe(false);
			expect(store.justificarDialogVisible()).toBe(false);
		});

		it('should reset saving and keep dialog open on error', async () => {
			api.crearSolicitudJustificacion.mockReturnValue(throwError(() => new Error('fail')));
			facade.openJustificarDialog({ asistenciaCursoId: 5, fecha: '2026-08-10', motivoRechazoAnterior: null });

			facade.crearSolicitudJustificacion(new FormData());

			await vi.waitFor(() => {
				expect(store.solicitudSaving()).toBe(false);
			});
			expect(store.justificarDialogVisible()).toBe(true);
		});
	});
	// #endregion
});
// #endregion
