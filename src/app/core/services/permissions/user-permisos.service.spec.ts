// * Tests for UserPermissionsService — validates tienePermiso, ensurePermisosLoaded, and state lifecycle.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';

import { UserPermissionsService } from './user-permisos.service';
import { AuthService } from '../auth';
import { StorageService } from '../storage';
import { PermissionsService } from './permisos.service';
import { CapabilityAuth } from './permisos.models';

// Test-only type to access private signals for state setup
interface ServiceTestAccess {
	_capabilities: { set: (v: CapabilityAuth[]) => void };
	_loaded: { set: (v: boolean) => void };
	_loadFailed: { set: (v: boolean) => void };
}

// #endregion

// #region Mocks
const mockCapabilities: CapabilityAuth[] = [
	{ codigo: 'admin.usuarios', ruta: 'intranet/admin/usuarios' },
	{ codigo: 'admin.cursos', ruta: 'intranet/admin/cursos' },
	{ codigo: 'profesor.horarios', ruta: 'intranet/profesor/horarios' },
	{ codigo: 'reports.view', ruta: null },
];

function createMocks() {
	const isAuthenticated$ = new Subject<boolean>();
	return {
		authService: {
			isAuthenticated: false,
			isAuthenticated$: isAuthenticated$.asObservable(),
			_trigger: isAuthenticated$,
		},
		storageService: {
			getPermisos: vi.fn().mockReturnValue(null),
			setPermisos: vi.fn(),
			clearPermisos: vi.fn(),
		},
		permisosService: {
			getMyCapabilities: vi.fn().mockReturnValue(of(mockCapabilities)),
		},
	};
}
// #endregion

// #region Tests
describe('UserPermissionsService', () => {
	let service: UserPermissionsService;
	let mocks: ReturnType<typeof createMocks>;

	beforeEach(() => {
		mocks = createMocks();

		TestBed.configureTestingModule({
			providers: [
				UserPermissionsService,
				{ provide: AuthService, useValue: mocks.authService },
				{ provide: StorageService, useValue: mocks.storageService },
				{ provide: PermissionsService, useValue: mocks.permisosService },
			],
		});

		service = TestBed.inject(UserPermissionsService);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should start without capabilities', () => {
			expect(service.capabilities()).toEqual([]);
			expect(service.loaded()).toBe(false);
			expect(service.loading()).toBe(false);
			expect(service.loadFailed()).toBe(false);
		});

		it('should have empty vistas', () => {
			expect(service.vistasPermitidas()).toEqual([]);
		});

		it('should have empty userCapabilities set', () => {
			expect(service.userCapabilities().size).toBe(0);
		});
	});
	// #endregion

	// #region tienePermiso — core authorization logic
	describe('tienePermiso', () => {
		beforeEach(() => {
			(service as unknown as ServiceTestAccess)._capabilities.set(mockCapabilities);
			(service as unknown as ServiceTestAccess)._loaded.set(true);
		});

		it('should allow exact route match', () => {
			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(true);
		});

		it('should deny non-matching route', () => {
			expect(service.tienePermiso('intranet/admin/salones')).toBe(false);
		});

		it('should be case-insensitive', () => {
			expect(service.tienePermiso('INTRANET/ADMIN/USUARIOS')).toBe(true);
			expect(service.tienePermiso('Intranet/Admin/Usuarios')).toBe(true);
		});

		it('should handle leading slash', () => {
			expect(service.tienePermiso('/intranet/admin/usuarios')).toBe(true);
		});

		it('should NOT grant access to sub-routes (granular check)', () => {
			expect(service.tienePermiso('intranet/admin')).toBe(false);
		});

		it('should NOT grant access to parent routes', () => {
			expect(service.tienePermiso('intranet')).toBe(false);
		});

		it('should NOT grant partial path matches', () => {
			expect(service.tienePermiso('intranet/admin/usuarios-admin')).toBe(false);
		});
	});
	// #endregion

	// #region tienePermiso edge cases
	describe('tienePermiso edge cases', () => {
		it('should deny when not loaded', () => {
			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(false);
		});

		it('should allow all when loaded with empty vistas (no route capabilities)', () => {
			(service as unknown as ServiceTestAccess)._capabilities.set([]);
			(service as unknown as ServiceTestAccess)._loaded.set(true);

			expect(service.tienePermiso('any/route')).toBe(true);
		});

		it('should handle empty string route', () => {
			(service as unknown as ServiceTestAccess)._capabilities.set(mockCapabilities);
			(service as unknown as ServiceTestAccess)._loaded.set(true);

			expect(service.tienePermiso('')).toBe(false);
		});

		it('should handle route with only slashes', () => {
			(service as unknown as ServiceTestAccess)._capabilities.set(mockCapabilities);
			(service as unknown as ServiceTestAccess)._loaded.set(true);

			expect(service.tienePermiso('/')).toBe(false);
		});
	});
	// #endregion

	// #region hasCapability
	describe('hasCapability', () => {
		beforeEach(() => {
			(service as unknown as ServiceTestAccess)._capabilities.set(mockCapabilities);
			(service as unknown as ServiceTestAccess)._loaded.set(true);
		});

		it('should return true for existing capability code', () => {
			expect(service.hasCapability('admin.usuarios')).toBe(true);
		});

		it('should return false for non-existing capability code', () => {
			expect(service.hasCapability('admin.nonexistent')).toBe(false);
		});

		it('should return true for capability without ruta', () => {
			expect(service.hasCapability('reports.view')).toBe(true);
		});
	});
	// #endregion

	// #region ensurePermisosLoaded — async flow for guards
	describe('ensurePermisosLoaded', () => {
		it('should return false when not authenticated', async () => {
			mocks.authService.isAuthenticated = false;

			const result = await service.ensurePermisosLoaded();

			expect(result).toBe(false);
		});

		it('should return true immediately when already loaded with capabilities', async () => {
			mocks.authService.isAuthenticated = true;
			(service as unknown as ServiceTestAccess)._loaded.set(true);
			(service as unknown as ServiceTestAccess)._capabilities.set(mockCapabilities);

			const result = await service.ensurePermisosLoaded();

			expect(result).toBe(true);
			expect(mocks.permisosService.getMyCapabilities).not.toHaveBeenCalled();
		});

		it('should fetch from API and return true on success', async () => {
			mocks.authService.isAuthenticated = true;

			const result = await service.ensurePermisosLoaded();

			expect(result).toBe(true);
			expect(mocks.permisosService.getMyCapabilities).toHaveBeenCalled();
			expect(service.capabilities()).toEqual(mockCapabilities);
			expect(service.loaded()).toBe(true);
		});

		it('should save to storage after successful fetch', async () => {
			mocks.authService.isAuthenticated = true;

			await service.ensurePermisosLoaded();

			expect(mocks.storageService.setPermisos).toHaveBeenCalledWith(
				expect.objectContaining({
					capabilities: mockCapabilities.map((c) => ({ codigo: c.codigo, ruta: c.ruta })),
					timestamp: expect.any(Number),
				}),
			);
		});

		it('should return false and set loadFailed on API error', async () => {
			mocks.authService.isAuthenticated = true;
			mocks.permisosService.getMyCapabilities = vi.fn().mockReturnValue(
				throwError(() => new Error('Network error')),
			);

			const result = await service.ensurePermisosLoaded();

			expect(result).toBe(false);
			expect(service.loadFailed()).toBe(true);
			expect(service.loading()).toBe(false);
		});

		it('should return false immediately if already failed', async () => {
			mocks.authService.isAuthenticated = true;
			(service as unknown as ServiceTestAccess)._loadFailed.set(true);

			const result = await service.ensurePermisosLoaded();

			expect(result).toBe(false);
			expect(mocks.permisosService.getMyCapabilities).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region Storage restore
	describe('storage restore', () => {
		it('should restore capabilities from storage on init', () => {
			const storedCaps: CapabilityAuth[] = [
				{ codigo: 'admin.usuarios', ruta: 'intranet/admin/usuarios' },
			];
			mocks.storageService.getPermisos.mockReturnValue({
				capabilities: storedCaps,
				timestamp: Date.now(),
			});

			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					UserPermissionsService,
					{ provide: AuthService, useValue: mocks.authService },
					{ provide: StorageService, useValue: mocks.storageService },
					{ provide: PermissionsService, useValue: mocks.permisosService },
				],
			});

			const freshService = TestBed.inject(UserPermissionsService);

			expect(freshService.capabilities()).toEqual(storedCaps);
			expect(freshService.loaded()).toBe(true);
		});

		it('should remain unloaded when storage returns null', () => {
			mocks.storageService.getPermisos.mockReturnValue(null);

			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					UserPermissionsService,
					{ provide: AuthService, useValue: mocks.authService },
					{ provide: StorageService, useValue: mocks.storageService },
					{ provide: PermissionsService, useValue: mocks.permisosService },
				],
			});

			const freshService = TestBed.inject(UserPermissionsService);

			expect(freshService.capabilities()).toEqual([]);
			expect(freshService.loaded()).toBe(false);
		});
	});
	// #endregion

	// #region clear
	describe('clear', () => {
		it('should reset state and clear storage', () => {
			(service as unknown as ServiceTestAccess)._capabilities.set(mockCapabilities);
			(service as unknown as ServiceTestAccess)._loaded.set(true);

			service.clear();

			expect(service.capabilities()).toEqual([]);
			expect(service.loaded()).toBe(false);
			expect(service.loading()).toBe(false);
			expect(service.loadFailed()).toBe(false);
			expect(mocks.storageService.clearPermisos).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region computed signals
	describe('computed signals', () => {
		it('should derive vistasPermitidas from capabilities with ruta', () => {
			(service as unknown as ServiceTestAccess)._capabilities.set(mockCapabilities);
			const expectedRoutes = mockCapabilities.filter((c) => c.ruta !== null).map((c) => c.ruta!);
			expect(service.vistasPermitidas()).toEqual(expectedRoutes);
		});

		it('should derive userCapabilities set from capability codes', () => {
			(service as unknown as ServiceTestAccess)._capabilities.set(mockCapabilities);
			const codes = service.userCapabilities();
			expect(codes.has('admin.usuarios')).toBe(true);
			expect(codes.has('reports.view')).toBe(true);
			expect(codes.has('nonexistent')).toBe(false);
		});

		it('should return empty array when capabilities is empty', () => {
			(service as unknown as ServiceTestAccess)._capabilities.set([]);
			expect(service.vistasPermitidas()).toEqual([]);
		});

		it('should return empty set when capabilities is empty', () => {
			(service as unknown as ServiceTestAccess)._capabilities.set([]);
			expect(service.userCapabilities().size).toBe(0);
		});
	});
	// #endregion
});
// #endregion
