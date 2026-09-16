// * Tests for PermissionsUsersDataFacade — validates saveOverrides() security-sensitive mutation (grant/deny capabilities per user).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

import { PermissionsUsersDataFacade } from './permisos-usuarios-data.facade';
import { PermissionsUsersStore } from './permisos-usuarios.store';
import { ErrorHandlerService, PermissionsService, SwService, WalCrossTabRefetchService, WalFacadeHelper } from '@core/services';

// #endregion

// #region Mocks
const mockUsuario = { id: 200, nombre: 'Ana Torres', dni: '12345678' } as never;

function createMockApi() {
	return {
		getCapabilityCatalog: vi.fn().mockReturnValue(of([])),
		getRolCapabilityMatrix: vi.fn().mockReturnValue(of([])),
		searchUsers: vi.fn().mockReturnValue(of({ usuarios: [] })),
		getUsuarioCapabilityOverview: vi.fn().mockReturnValue(
			of({ inheritedCapabilityIds: [1, 2], grantIds: [3], denyIds: [1] }),
		),
		setUsuarioCapabilities: vi.fn().mockReturnValue(of({ mensaje: 'ok' })),
	};
}

function createMockWal() {
	return {
		execute: vi.fn((config: { onCommit?: () => void; optimistic?: { apply: () => void } }) => {
			config.optimistic?.apply();
		}),
	};
}
// #endregion

// #region Tests
describe('PermissionsUsersDataFacade', () => {
	let facade: PermissionsUsersDataFacade;
	let store: PermissionsUsersStore;
	let api: ReturnType<typeof createMockApi>;
	let wal: ReturnType<typeof createMockWal>;
	let errorHandler: { showError: ReturnType<typeof vi.fn>; showSuccess: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = createMockApi();
		wal = createMockWal();
		errorHandler = { showError: vi.fn(), showSuccess: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				PermissionsUsersDataFacade,
				PermissionsUsersStore,
				{ provide: PermissionsService, useValue: api },
				{ provide: WalFacadeHelper, useValue: wal },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: SwService, useValue: { invalidateCacheByPattern: vi.fn().mockResolvedValue(undefined) } },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
			],
		});

		facade = TestBed.inject(PermissionsUsersDataFacade);
		store = TestBed.inject(PermissionsUsersStore);
	});

	// #region saveOverrides
	describe('saveOverrides', () => {
		beforeEach(() => {
			store.setSelectedUsuario(mockUsuario);
			store.setSelectedRolId(5);
			store.setOverview({ inheritedCapabilityIds: [1, 2], grantIds: [3], denyIds: [1] } as never);
		});

		it('should call WAL execute with exactly the granted and denied capability ids', () => {
			facade.saveOverrides();

			expect(wal.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					operation: 'UPDATE',
					resourceType: 'usuarioCapabilities',
					resourceId: 200,
					method: 'PUT',
					payload: { grants: [3], denies: [1] },
				}),
			);
		});

		it('should show success, close the dialog and reload the overview on commit', () => {
			wal.execute.mockImplementationOnce((config: { onCommit?: () => void; optimistic?: { apply: () => void } }) => {
				config.optimistic?.apply();
				config.onCommit?.();
			});
			store.openDialog();

			facade.saveOverrides();

			expect(errorHandler.showSuccess).toHaveBeenCalled();
			expect(store.dialogVisible()).toBe(false);
			expect(api.getUsuarioCapabilityOverview).toHaveBeenCalledWith(200, 5);
		});

		it('should invoke the onSettled callback on commit', () => {
			wal.execute.mockImplementationOnce((config: { onCommit?: () => void }) => {
				config.onCommit?.();
			});
			const onSettled = vi.fn();

			facade.saveOverrides(onSettled);

			expect(onSettled).toHaveBeenCalled();
		});

		it('should reopen the dialog and invoke onSettled on WAL error, without saving', () => {
			wal.execute.mockImplementationOnce((config: { onError?: (err: unknown) => void; optimistic?: { apply: () => void; rollback: () => void } }) => {
				config.optimistic?.apply();
				config.optimistic?.rollback();
				config.onError?.(new Error('fail'));
			});
			store.closeDialog();
			const onSettled = vi.fn();

			facade.saveOverrides(onSettled);

			expect(store.dialogVisible()).toBe(true);
			expect(onSettled).toHaveBeenCalled();
		});

		it('should not call WAL execute without a selected usuario or rol', () => {
			store.setSelectedUsuario(null);

			facade.saveOverrides();

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
