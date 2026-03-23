// * Tests for PermisosRolesFacade — validates UI orchestration and WAL integration.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { PermisosRolesFacade } from './permisos-roles.facade';
import { PermisosRolesStore } from './permisos-roles.store';
import { PermisosService, PermisoRol } from '@core/services';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { UiMappingService } from '@shared/services';

// #endregion

// #region Mocks
const mockVistas = [
	{ id: 1, ruta: 'intranet/admin/usuarios', nombre: 'Usuarios', estado: 1 },
	{ id: 2, ruta: 'intranet/admin/cursos', nombre: 'Cursos', estado: 1 },
	{ id: 3, ruta: 'intranet/admin/salones', nombre: 'Salones', estado: 0 },
];

const mockPermisos: PermisoRol[] = [
	{ id: 1, rol: 'Director', vistas: ['intranet/admin/usuarios', 'intranet/admin/cursos'] },
];

function createMockApi() {
	return {
		getVistas: vi.fn().mockReturnValue(of(mockVistas)),
		getPermisosRolPaginated: vi.fn().mockReturnValue(of({ data: mockPermisos, page: 1, pageSize: 10, total: 1 })),
		crearPermisoRol: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		actualizarPermisoRol: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
		eliminarPermisoRol: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
	};
}

function createMockWal() {
	return {
		execute: vi.fn((config: { optimistic?: { apply: () => void } }) => {
			config.optimistic?.apply();
		}),
	};
}
// #endregion

// #region Tests
describe('PermisosRolesFacade', () => {
	let facade: PermisosRolesFacade;
	let store: PermisosRolesStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();

		TestBed.configureTestingModule({
			providers: [
				PermisosRolesFacade,
				PermisosRolesStore,
				UiMappingService,
				{ provide: PermisosService, useValue: api },
				{ provide: ErrorHandlerService, useValue: { showError: vi.fn(), showSuccess: vi.fn() } },
				{ provide: WalFacadeHelper, useValue: wal },
			],
		});

		facade = TestBed.inject(PermisosRolesFacade);
		store = TestBed.inject(PermisosRolesStore);
	});

	// #region loadAll
	describe('loadAll', () => {
		it('should load vistas (active only) and permisos into store', () => {
			facade.loadAll();

			// Only estado=1 vistas should be stored
			expect(store.vistas()).toHaveLength(2);
			expect(store.vistas().every((v) => v.estado === 1)).toBe(true);
			expect(store.permisosRol()).toEqual(mockPermisos);
			expect(store.loading()).toBe(false);
		});
	});
	// #endregion

	// #region UI commands — dialog
	describe('dialog commands', () => {
		beforeEach(() => {
			store.setVistas(mockVistas.filter((v) => v.estado === 1) as never[]);
		});

		it('should open new dialog with empty selections', () => {
			facade.openNewDialog();

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(false);
			expect(store.selectedVistas()).toEqual([]);
			expect(store.selectedRol()).toBeNull();
			expect(store.modulosVistas().length).toBeGreaterThan(0);
		});

		it('should open edit dialog with permiso data', () => {
			facade.openEditDialog(mockPermisos[0]);

			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
			expect(store.selectedRol()).toBe('Director');
			expect(store.selectedVistas()).toEqual(mockPermisos[0].vistas);
		});

		it('should close dialog', () => {
			facade.openNewDialog();
			facade.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Detail drawer
	describe('detail drawer', () => {
		it('should open detail', () => {
			facade.openDetail(mockPermisos[0]);
			expect(store.detailDrawerVisible()).toBe(true);
			expect(store.selectedPermiso()).toEqual(mockPermisos[0]);
		});

		it('should close detail', () => {
			facade.openDetail(mockPermisos[0]);
			facade.closeDetail();
			expect(store.detailDrawerVisible()).toBe(false);
		});

		it('should edit from detail', () => {
			store.setVistas(mockVistas.filter((v) => v.estado === 1) as never[]);
			facade.openDetail(mockPermisos[0]);
			facade.editFromDetail();

			expect(store.detailDrawerVisible()).toBe(false);
			expect(store.dialogVisible()).toBe(true);
			expect(store.isEditing()).toBe(true);
		});
	});
	// #endregion

	// #region WAL operations — optimistic apply
	describe('WAL operations', () => {
		beforeEach(() => {
			store.setPermisosRol(mockPermisos);
			store.setPaginationData(1, 10, 1);
		});

		it('should close dialog on save create (optimistic)', () => {
			store.setVistas(mockVistas.filter((v) => v.estado === 1) as never[]);
			facade.openNewDialog();
			store.setSelectedRol('Profesor');
			store.setSelectedVistas(['intranet/admin/usuarios']);

			facade.savePermiso();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'CREATE' }),
			);
			expect(store.dialogVisible()).toBe(false);
		});

		it('should close dialog on save update (optimistic)', () => {
			store.setVistas(mockVistas.filter((v) => v.estado === 1) as never[]);
			facade.openEditDialog(mockPermisos[0]);

			facade.savePermiso();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({ operation: 'UPDATE' }),
			);
			expect(store.dialogVisible()).toBe(false);
		});

		it('should remove permiso on delete (optimistic)', () => {
			facade.delete(mockPermisos[0]);

			expect(store.permisosRol()).toHaveLength(0);
			expect(store.totalRecords()).toBe(0);
		});
	});
	// #endregion

	// #region Form delegation
	describe('form delegation', () => {
		it('should delegate toggleVista', () => {
			facade.toggleVista('intranet/admin/usuarios');
			expect(store.selectedVistas()).toContain('intranet/admin/usuarios');
		});

		it('should delegate setSelectedRol', () => {
			facade.setSelectedRol('Profesor');
			expect(store.selectedRol()).toBe('Profesor');
		});

		it('should delegate setVistasBusqueda', () => {
			facade.setVistasBusqueda('user');
			expect(store.vistasBusqueda()).toBe('user');
		});

		it('should delegate setActiveModuloIndex', () => {
			facade.setActiveModuloIndex(2);
			expect(store.activeModuloIndex()).toBe(2);
		});
	});
	// #endregion

	// #region Confirm dialog
	describe('confirm dialog', () => {
		it('should manage confirm dialog', () => {
			facade.openConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(true);
			facade.closeConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
