import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WalCrossTabRefetchService, WalFacadeHelper } from '@core/services/wal';
/* eslint-disable layer-enforcement/imports-error -- Razón: test mocks para API service y DTOs cross-role */
import { HealthPermissionsApiService } from '@features/intranet/pages/profesor/classrooms/services/health-permissions-api.service';
import type {
	HealthExitPermissionDto,
	HealthJustificationDto,
	StudentForHealthDto,
	SymptomDto,
	CreateHealthExitRequest,
} from '@features/intranet/pages/profesor/models';
/* eslint-enable layer-enforcement/imports-error */

import type { SalonForHealthDto } from '../models/admin-health-permissions.models';
import { AdminHealthPermissionsFacade } from './admin-health-permissions.facade';
import { AdminHealthPermissionsStore } from './admin-health-permissions.store';

function makeSalon(overrides: Partial<SalonForHealthDto> = {}): SalonForHealthDto {
	return { id: 1, descripcion: '1ro A', cantidadEstudiantes: 30, ...overrides };
}

function makePermiso(overrides: Partial<HealthExitPermissionDto> = {}): HealthExitPermissionDto {
	return {
		id: 1,
		estudianteId: 10,
		estudianteNombre: 'María',
		fecha: '2026-05-26',
		horaSalida: '10:30',
		sintomas: ['FIEBRE'],
		sintomasDisplay: 'Fiebre',
		sintomaDetalle: null,
		observacion: null,
		profesorNombre: 'Prof. García',
		estado: true,
		...overrides,
	};
}

function makeJustificacion(overrides: Partial<HealthJustificationDto> = {}): HealthJustificationDto {
	return {
		id: 1,
		estudianteId: 10,
		estudianteNombre: 'María',
		documentoUrl: '/docs/cert.pdf',
		documentoNombre: 'cert.pdf',
		observacion: null,
		dias: [{ fecha: '2026-05-25', estadoOriginal: 'FALTA' }],
		profesorNombre: 'Prof. García',
		fechaRegistro: '2026-05-26T08:00:00',
		estado: true,
		...overrides,
	};
}

function makeEstudiante(overrides: Partial<StudentForHealthDto> = {}): StudentForHealthDto {
	return { id: 10, dni: '12345678', nombreCompleto: 'María López', tieneEntradaHoy: true, ...overrides };
}

describe('AdminHealthPermissionsFacade', () => {
	let facade: AdminHealthPermissionsFacade;
	let store: AdminHealthPermissionsStore;
	let api: {
		getSalones: ReturnType<typeof vi.fn>;
		getResumen: ReturnType<typeof vi.fn>;
		getEstudiantes: ReturnType<typeof vi.fn>;
		getSintomas: ReturnType<typeof vi.fn>;
		crearPermisoSalida: ReturnType<typeof vi.fn>;
		anularPermisoSalida: ReturnType<typeof vi.fn>;
		crearJustificacion: ReturnType<typeof vi.fn>;
		anularJustificacion: ReturnType<typeof vi.fn>;
		validarFechas: ReturnType<typeof vi.fn>;
	};
	let walHelper: { execute: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = {
			getSalones: vi.fn().mockReturnValue(of([])),
			getResumen: vi.fn().mockReturnValue(of({ permisosSalida: [], justificaciones: [] })),
			getEstudiantes: vi.fn().mockReturnValue(of([])),
			getSintomas: vi.fn().mockReturnValue(of([])),
			crearPermisoSalida: vi.fn().mockReturnValue(of(makePermiso())),
			anularPermisoSalida: vi.fn().mockReturnValue(of(undefined)),
			crearJustificacion: vi.fn().mockReturnValue(of(makeJustificacion())),
			anularJustificacion: vi.fn().mockReturnValue(of(undefined)),
			validarFechas: vi.fn().mockReturnValue(of([])),
		};
		walHelper = { execute: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				AdminHealthPermissionsFacade,
				AdminHealthPermissionsStore,
				{ provide: HealthPermissionsApiService, useValue: api },
				{ provide: WalFacadeHelper, useValue: walHelper },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
			],
		});
		store = TestBed.inject(AdminHealthPermissionsStore);
		facade = TestBed.inject(AdminHealthPermissionsFacade);
	});

	describe('loadSalones', () => {
		it('carga salones y setea en store', () => {
			const salones = [makeSalon({ id: 1 }), makeSalon({ id: 2 })];
			api.getSalones.mockReturnValue(of(salones));

			facade.loadSalones();

			expect(store.salones()).toEqual(salones);
			expect(store.salonesLoading()).toBe(false);
		});

		it('en error setea salonesLoading=false', () => {
			api.getSalones.mockReturnValue(throwError(() => new Error('fail')));

			facade.loadSalones();

			expect(store.salonesLoading()).toBe(false);
		});

		it('no recarga si ya está loading', () => {
			store.setSalonesLoading(true);
			facade.loadSalones();
			expect(api.getSalones).not.toHaveBeenCalled();
		});
	});

	describe('onSalonChange', () => {
		it('actualiza selección, limpia datos previos y carga resumen', () => {
			store.setPermisosSalida([makePermiso()]);
			const sintomas: SymptomDto[] = [{ codigo: 'FIEBRE', nombre: 'Fiebre' }];
			api.getResumen.mockReturnValue(of({ permisosSalida: [makePermiso({ id: 5 })], justificaciones: [] }));
			api.getEstudiantes.mockReturnValue(of([makeEstudiante()]));
			api.getSintomas.mockReturnValue(of(sintomas));

			facade.onSalonChange(3);

			expect(store.selectedSalonId()).toBe(3);
			expect(api.getResumen).toHaveBeenCalledWith(3);
			expect(api.getEstudiantes).toHaveBeenCalledWith(3);
		});
	});

	describe('loadResumen', () => {
		it('carga resumen + estudiantes + síntomas cuando no hay síntomas cacheados', () => {
			const permisos = [makePermiso({ id: 1 })];
			const justificaciones = [makeJustificacion({ id: 1 })];
			const estudiantes = [makeEstudiante({ id: 1 })];
			const sintomas: SymptomDto[] = [{ codigo: 'FIEBRE', nombre: 'Fiebre' }];

			api.getResumen.mockReturnValue(of({ permisosSalida: permisos, justificaciones }));
			api.getEstudiantes.mockReturnValue(of(estudiantes));
			api.getSintomas.mockReturnValue(of(sintomas));

			facade.loadResumen(1);

			expect(store.permisosSalida()).toEqual(permisos);
			expect(store.justificaciones()).toEqual(justificaciones);
			expect(store.estudiantes()).toEqual(estudiantes);
			expect(store.sintomas()).toEqual(sintomas);
			expect(store.loading()).toBe(false);
		});

		it('no recarga síntomas si ya están cacheados', () => {
			store.setSintomas([{ codigo: 'X', nombre: 'X' }]);
			api.getResumen.mockReturnValue(of({ permisosSalida: [], justificaciones: [] }));
			api.getEstudiantes.mockReturnValue(of([]));

			facade.loadResumen(1);

			expect(api.getSintomas).not.toHaveBeenCalled();
		});

		it('en error setea loading=false', () => {
			api.getResumen.mockReturnValue(throwError(() => new Error('fail')));

			facade.loadResumen(1);

			expect(store.loading()).toBe(false);
		});

		it('no recarga si ya está loading', () => {
			store.setLoading(true);
			facade.loadResumen(1);
			expect(api.getResumen).not.toHaveBeenCalled();
		});
	});

	describe('crearPermisoSalida (WAL)', () => {
		interface CapturedConfig {
			optimistic: { apply: () => void; rollback: () => void };
			onCommit: (result: HealthExitPermissionDto) => void;
			onError: (err: unknown) => void;
		}

		it('ejecuta WAL con payload correcto', () => {
			const dto: CreateHealthExitRequest = {
				estudianteId: 10,
				sintomas: ['FIEBRE'],
				sintomaDetalle: null,
				observacion: null,
			};
			facade.crearPermisoSalida(dto);

			expect(walHelper.execute).toHaveBeenCalled();
			const cfg = walHelper.execute.mock.calls[0][0];
			expect(cfg.operation).toBe('CREATE');
			expect(cfg.resourceType).toBe('permisos-salud-salida');
			expect(cfg.payload).toEqual(dto);
		});

		it('apply cierra dialog', () => {
			store.openExitDialog();
			facade.crearPermisoSalida({
				estudianteId: 10,
				sintomas: ['FIEBRE'],
				sintomaDetalle: null,
				observacion: null,
			});

			const cfg = walHelper.execute.mock.calls[0][0] as CapturedConfig;
			cfg.optimistic.apply();
			expect(store.exitDialogVisible()).toBe(false);
		});

		it('onCommit agrega permiso al store', () => {
			facade.crearPermisoSalida({
				estudianteId: 10,
				sintomas: ['FIEBRE'],
				sintomaDetalle: null,
				observacion: null,
			});

			const cfg = walHelper.execute.mock.calls[0][0] as CapturedConfig;
			const permiso = makePermiso({ id: 99 });
			cfg.onCommit(permiso);
			expect(store.permisosSalida()[0].id).toBe(99);
		});
	});

	describe('anularPermisoSalida', () => {
		it('remueve permiso del store en success', () => {
			store.setPermisosSalida([makePermiso({ id: 1 }), makePermiso({ id: 2 })]);
			api.anularPermisoSalida.mockReturnValue(of(undefined));

			facade.anularPermisoSalida(1);

			expect(store.permisosSalida().map((p) => p.id)).toEqual([2]);
		});
	});

	describe('crearJustificacion (WAL)', () => {
		it('ejecuta WAL con resourceType correcto', () => {
			const formData = new FormData();
			facade.crearJustificacion(formData);

			expect(walHelper.execute).toHaveBeenCalled();
			const cfg = walHelper.execute.mock.calls[0][0];
			expect(cfg.operation).toBe('CREATE');
			expect(cfg.resourceType).toBe('permisos-salud-justificacion');
		});
	});

	describe('anularJustificacion', () => {
		it('remueve justificación del store en success', () => {
			store.setJustificaciones([makeJustificacion({ id: 1 }), makeJustificacion({ id: 2 })]);
			api.anularJustificacion.mockReturnValue(of(undefined));

			facade.anularJustificacion(1);

			expect(store.justificaciones().map((j) => j.id)).toEqual([2]);
		});
	});

	describe('UI helpers', () => {
		it('openExitDialog / closeExitDialog', () => {
			facade.openExitDialog();
			expect(store.exitDialogVisible()).toBe(true);
			facade.closeExitDialog();
			expect(store.exitDialogVisible()).toBe(false);
		});

		it('openJustificationDialog / closeJustificationDialog', () => {
			facade.openJustificationDialog();
			expect(store.justificationDialogVisible()).toBe(true);
			facade.closeJustificationDialog();
			expect(store.justificationDialogVisible()).toBe(false);
		});
	});
});
