// * Behavior tests for UsersCrudFacade — create/update/toggle/delete/import flows.
// Verifies the full chain: command → WAL optimistic.apply → onCommit/rollback → store state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { UsersCrudFacade } from './usuarios-crud.facade';
import { UsersStore } from './usuarios.store';
import { UsersService } from './usuarios.service';
import { UsersDataFacade } from './usuarios-data.facade';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { DebugService } from '@core/helpers';
import type { ImportarEstudiantesResponse, UsuarioDetalle, UsuarioLista, UsuariosEstadisticas } from '../models';

// #endregion

// #region Fixtures
const mockStats: UsuariosEstadisticas = {
	totalUsuarios: 3, totalDirectores: 1, totalAsistentesAdministrativos: 0,
	totalPromotores: 0, totalProfesores: 1, totalApoderados: 0, totalEstudiantes: 1,
	usuariosActivos: 2, usuariosInactivos: 1,
};

const mockUsuarios: UsuarioLista[] = [
	{ id: 1, dni: '11111111', nombres: 'Juan', apellidos: 'Pérez', nombreCompleto: 'Juan Pérez', rol: 'Director', estado: true, fechaRegistro: '2025-01-01', sedeId: 1, rowVersion: 'v1' },
	{ id: 2, dni: '22222222', nombres: 'María', apellidos: 'García', nombreCompleto: 'María García', rol: 'Profesor', estado: true, fechaRegistro: '2025-01-01', sedeId: 1, rowVersion: 'v1' },
	{ id: 3, dni: '33333333', nombres: 'Pedro', apellidos: 'López', nombreCompleto: 'Pedro López', rol: 'Estudiante', estado: false, fechaRegistro: '2025-01-01', sedeId: 1, rowVersion: 'v1' },
];

const mockDetalle: UsuarioDetalle = { ...mockUsuarios[1], contrasena: 'secret', correo: 'maria@test.com' };

const noopLog = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn(), time: vi.fn(), once: vi.fn() };
const mockDebug = { dbg: () => noopLog } as unknown as DebugService;
// #endregion

// #region Controllable WAL mock
// Captures the last config; tests decide when to trigger onCommit or rollback+onError.
interface WalConfig {
	operation: string;
	optimistic?: { apply: () => void; rollback: () => void };
	onCommit: (result?: unknown) => void;
	onError: (err: unknown) => void;
}

function createControllableWal() {
	const configs: WalConfig[] = [];
	const execute = vi.fn((config: WalConfig) => {
		configs.push(config);
		config.optimistic?.apply();
	});
	return {
		execute,
		last: () => configs[configs.length - 1],
		configs,
		commit: (result?: unknown) => configs[configs.length - 1].onCommit(result),
		fail: (err: unknown) => {
			const cfg = configs[configs.length - 1];
			cfg.optimistic?.rollback();
			cfg.onError(err);
		},
	};
}

function createMockApi() {
	return {
		crearUsuario: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		actualizarUsuario: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		eliminarUsuario: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		cambiarEstado: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		importarEstudiantes: vi.fn(),
	};
}
// #endregion

describe('UsersCrudFacade', () => {
	let facade: UsersCrudFacade;
	let store: UsersStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createControllableWal>;
	let dataFacade: { markCrudMutation: ReturnType<typeof vi.fn> };
	let errorHandler: { showError: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = createMockApi();
		wal = createControllableWal();
		dataFacade = { markCrudMutation: vi.fn() };
		errorHandler = { showError: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				UsersCrudFacade,
				UsersStore,
				{ provide: UsersService, useValue: api },
				{ provide: UsersDataFacade, useValue: dataFacade },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: DebugService, useValue: mockDebug },
			],
		});

		facade = TestBed.inject(UsersCrudFacade);
		store = TestBed.inject(UsersStore);
		store.setItems(mockUsuarios);
		store.setEstadisticas(mockStats);
		store.setTotalRecords(3);
	});

	// #region saveUsuario dispatch
	describe('saveUsuario dispatch', () => {
		it('issues CREATE when not editing', () => {
			store.openNewDialog();
			store.setFormData({
				dni: '44444444', nombres: 'Ana', apellidos: 'Ruiz',
				contrasena: 'Pass1234', rol: 'Apoderado', estado: true,
			});

			facade.saveUsuario();

			expect(wal.execute).toHaveBeenCalledTimes(1);
			expect(wal.last().operation).toBe('CREATE');
		});

		it('issues UPDATE when editing', () => {
			store.openEditDialog(mockDetalle);
			store.setFormData({
				dni: mockDetalle.dni, nombres: 'María Luisa', apellidos: mockDetalle.apellidos,
				rol: mockDetalle.rol, estado: true, correo: mockDetalle.correo,
			});

			facade.saveUsuario();

			expect(wal.last().operation).toBe('UPDATE');
		});

		it('skips CREATE when payload is invalid (missing rol/contrasena)', () => {
			store.openNewDialog();
			store.setFormData({ dni: '55555555', nombres: 'X', apellidos: 'Y' });

			facade.saveUsuario();

			expect(wal.execute).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region CREATE flow
	describe('create flow', () => {
		beforeEach(() => {
			store.openNewDialog();
			store.setFormData({
				dni: '44444444', nombres: 'Ana', apellidos: 'Ruiz',
				contrasena: 'Pass1234', rol: 'Apoderado', estado: true,
			});
			facade.saveUsuario();
		});

		it('optimistic apply closes dialog immediately', () => {
			expect(store.dialogVisible()).toBe(false);
		});

		it('onCommit triggers refresh and increments total/activos/rol stats', () => {
			const refreshBefore = store.refreshCounter();
			wal.commit();

			expect(store.refreshCounter()).toBe(refreshBefore + 1);
			expect(store.estadisticas()?.totalUsuarios).toBe(mockStats.totalUsuarios + 1);
			expect(store.estadisticas()?.usuariosActivos).toBe(mockStats.usuariosActivos + 1);
			expect(store.estadisticas()?.totalApoderados).toBe(mockStats.totalApoderados + 1);
		});

		it('onError surfaces error and clears loading (no state mutation)', () => {
			wal.fail(new Error('boom'));

			expect(errorHandler.showError).toHaveBeenCalled();
			expect(store.loading()).toBe(false);
			// Stats unchanged because onCommit was not called and rollback is a no-op for create
			expect(store.estadisticas()?.totalUsuarios).toBe(mockStats.totalUsuarios);
		});
	});
	// #endregion

	// #region UPDATE flow
	describe('update flow', () => {
		beforeEach(() => {
			store.openEditDialog(mockDetalle);
			store.setFormData({
				dni: mockDetalle.dni, nombres: 'María Luisa', apellidos: 'Nuevo',
				rol: mockDetalle.rol, estado: true, correo: 'new@test.com',
			});
			facade.saveUsuario();
		});

		it('optimistic apply mutates item and closes dialog', () => {
			const user = store.items().find((u) => u.id === mockDetalle.id);
			expect(user?.nombres).toBe('María Luisa');
			expect(user?.apellidos).toBe('Nuevo');
			expect(user?.correo).toBe('new@test.com');
			expect(store.dialogVisible()).toBe(false);
			expect(dataFacade.markCrudMutation).toHaveBeenCalled();
		});

		it('rollback on error restores previous user data exactly', () => {
			wal.fail(new Error('boom'));

			const user = store.items().find((u) => u.id === mockDetalle.id);
			expect(user?.nombres).toBe(mockDetalle.nombres);
			expect(user?.apellidos).toBe(mockDetalle.apellidos);
			expect(user?.correo).toBe(mockDetalle.correo);
			expect(errorHandler.showError).toHaveBeenCalled();
		});

		it('onCommit is a no-op (no refetch for updates)', () => {
			const before = store.refreshCounter();
			wal.commit();
			expect(store.refreshCounter()).toBe(before);
		});
	});
	// #endregion

	// #region DELETE flow
	describe('delete flow', () => {
		it('optimistic removes item and decrements total/activos/rol stats', () => {
			facade.deleteUsuario(mockUsuarios[1]); // Profesor activo

			expect(store.items().find((u) => u.id === 2)).toBeUndefined();
			expect(store.totalRecords()).toBe(2);
			expect(store.estadisticas()?.totalUsuarios).toBe(mockStats.totalUsuarios - 1);
			expect(store.estadisticas()?.usuariosActivos).toBe(mockStats.usuariosActivos - 1);
			expect(store.estadisticas()?.usuariosInactivos).toBe(mockStats.usuariosInactivos);
			expect(store.estadisticas()?.totalProfesores).toBe(mockStats.totalProfesores - 1);
			expect(dataFacade.markCrudMutation).toHaveBeenCalled();
		});

		it('deleting an inactive user updates inactivos counter only', () => {
			facade.deleteUsuario(mockUsuarios[2]); // Estudiante inactivo

			expect(store.estadisticas()?.usuariosActivos).toBe(mockStats.usuariosActivos);
			expect(store.estadisticas()?.usuariosInactivos).toBe(mockStats.usuariosInactivos - 1);
			expect(store.estadisticas()?.totalEstudiantes).toBe(mockStats.totalEstudiantes - 1);
		});

		it('rollback on error restores item and all stats exactly', () => {
			facade.deleteUsuario(mockUsuarios[1]);
			wal.fail(new Error('boom'));

			expect(store.items().find((u) => u.id === 2)).toEqual(mockUsuarios[1]);
			expect(store.totalRecords()).toBe(3);
			expect(store.estadisticas()).toEqual(mockStats);
			expect(errorHandler.showError).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region TOGGLE flow
	describe('toggle flow', () => {
		it('optimistic flips estado and moves counter from activos to inactivos', () => {
			facade.toggleEstado(mockUsuarios[1]); // was active

			expect(store.items().find((u) => u.id === 2)?.estado).toBe(false);
			expect(store.estadisticas()?.usuariosActivos).toBe(mockStats.usuariosActivos - 1);
			expect(store.estadisticas()?.usuariosInactivos).toBe(mockStats.usuariosInactivos + 1);
			expect(dataFacade.markCrudMutation).toHaveBeenCalled();
		});

		it('toggling inactive → active moves counter in the opposite direction', () => {
			facade.toggleEstado(mockUsuarios[2]); // was inactive

			expect(store.items().find((u) => u.id === 3)?.estado).toBe(true);
			expect(store.estadisticas()?.usuariosActivos).toBe(mockStats.usuariosActivos + 1);
			expect(store.estadisticas()?.usuariosInactivos).toBe(mockStats.usuariosInactivos - 1);
		});

		it('rollback on error restores estado and stats exactly', () => {
			facade.toggleEstado(mockUsuarios[1]);
			wal.fail(new Error('boom'));

			expect(store.items().find((u) => u.id === 2)?.estado).toBe(true);
			expect(store.estadisticas()).toEqual(mockStats);
			expect(errorHandler.showError).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region Import flow
	describe('import flow', () => {
		const importResult: ImportarEstudiantesResponse = {
			creados: 2, actualizados: 0, errores: 0, detalles: [],
		} as unknown as ImportarEstudiantesResponse;

		it('on success stores result and increments stats only when creados > 0', () => {
			api.importarEstudiantes.mockReturnValue(of(importResult));
			const before = store.refreshCounter();

			facade.importarEstudiantes([]);

			expect(store.importLoading()).toBe(false);
			expect(store.importResult()).toEqual(importResult);
			expect(store.refreshCounter()).toBe(before + 1);
			expect(store.estadisticas()?.totalEstudiantes).toBe(mockStats.totalEstudiantes + 2);
			expect(store.estadisticas()?.totalUsuarios).toBe(mockStats.totalUsuarios + 2);
			expect(store.estadisticas()?.usuariosActivos).toBe(mockStats.usuariosActivos + 2);
		});

		it('on success with only actualizados refreshes but does not change stats', () => {
			const onlyUpdates = { creados: 0, actualizados: 3, errores: 0, detalles: [] } as unknown as ImportarEstudiantesResponse;
			api.importarEstudiantes.mockReturnValue(of(onlyUpdates));
			const before = store.refreshCounter();

			facade.importarEstudiantes([]);

			expect(store.refreshCounter()).toBe(before + 1);
			expect(store.estadisticas()?.totalUsuarios).toBe(mockStats.totalUsuarios);
		});

		it('on error surfaces message, clears loading, leaves stats intact', () => {
			api.importarEstudiantes.mockReturnValue(throwError(() => new Error('server')));

			facade.importarEstudiantes([]);

			expect(store.importLoading()).toBe(false);
			expect(errorHandler.showError).toHaveBeenCalled();
			expect(store.estadisticas()).toEqual(mockStats);
		});
	});
	// #endregion
});
