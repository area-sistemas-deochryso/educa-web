// * Security contract tests for UserPermissionsService.
// * Verifies authorization invariants INV-S03 and INV-S04.
// * Complements user-permisos.service.spec.ts (functional behavior).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';

import { UserPermissionsService } from './user-permisos.service';
import { AuthService } from '../auth';
import { StorageService } from '../storage';
import { PermissionsService } from './permisos.service';
import { CapabilityAuth } from './permisos.models';

// Test-only type to access private signals for state setup
interface PermissionsServiceTestAccess {
	_capabilities: { set: (v: CapabilityAuth[]) => void };
	_loaded: { set: (v: boolean) => void };
}

// #endregion

// #region Mocks
const mockCapabilities: CapabilityAuth[] = [
	{ codigo: 'ADMIN_USUARIOS', ruta: 'intranet/admin/usuarios' },
	{ codigo: 'ADMIN_CURSOS', ruta: 'intranet/admin/cursos' },
];

function createMocks() {
	const isAuthenticated$ = new Subject<boolean>();
	return {
		authService: {
			isAuthenticated: true,
			isAuthenticated$: isAuthenticated$.asObservable(),
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

// #region Security contract tests
describe('UserPermissionsService — Security Contracts', () => {
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

	// #region INV-S03: Capabilities define access exclusively
	describe('INV-S03: Only granted capabilities grant route access', () => {
		it('should deny routes not in capabilities and allow those that are', () => {
			const customCaps: CapabilityAuth[] = [{ codigo: 'PROF_HORARIOS', ruta: 'intranet/profesor/horarios' }];
			(service as unknown as PermissionsServiceTestAccess)._capabilities.set(customCaps);
			(service as unknown as PermissionsServiceTestAccess)._loaded.set(true);

			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(false);
			expect(service.tienePermiso('intranet/profesor/horarios')).toBe(true);
		});
	});
	// #endregion

	// #region INV-S04: Exact path matching, no inheritance
	describe('INV-S04: Exact route match — no wildcard or parent inheritance', () => {
		beforeEach(() => {
			(service as unknown as PermissionsServiceTestAccess)._capabilities.set(mockCapabilities);
			(service as unknown as PermissionsServiceTestAccess)._loaded.set(true);
		});

		it('should deny parent route when only child is permitted', () => {
			// Has intranet/admin/usuarios but NOT intranet/admin
			expect(service.tienePermiso('intranet/admin')).toBe(false);
		});

		it('should deny child route when only parent is permitted', () => {
			(service as unknown as PermissionsServiceTestAccess)._capabilities.set([
				{ codigo: 'ADMIN', ruta: 'intranet/admin' },
			]);

			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(false);
		});

		it('should deny suffix-extended routes', () => {
			// intranet/admin/usuarios does NOT match intranet/admin/usuarios-importar
			expect(service.tienePermiso('intranet/admin/usuarios-importar')).toBe(false);
		});
	});
	// #endregion

	// #region INV: Deny by default when not loaded
	describe('INV: Default-deny when permissions not loaded', () => {
		it('should deny access when permisos have not been loaded yet', () => {
			// Fresh service — loaded=false
			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(false);
		});

		it('should allow all when loaded with empty capabilities (backend controls access)', () => {
			(service as unknown as PermissionsServiceTestAccess)._capabilities.set([]);
			(service as unknown as PermissionsServiceTestAccess)._loaded.set(true);

			expect(service.tienePermiso('any/route/whatsoever')).toBe(true);
		});
	});
	// #endregion

	// #region INV: clear() is thorough
	describe('INV: clear() stops refresh, resets signals, and clears storage', () => {
		it('should reset all state signals', () => {
			(service as unknown as PermissionsServiceTestAccess)._capabilities.set(mockCapabilities);
			(service as unknown as PermissionsServiceTestAccess)._loaded.set(true);

			service.clear();

			expect(service.capabilities()).toEqual([]);
			expect(service.loaded()).toBe(false);
			expect(service.loading()).toBe(false);
			expect(service.loadFailed()).toBe(false);
		});

		it('should clear permisos from storage', () => {
			service.clear();

			expect(mocks.storageService.clearPermisos).toHaveBeenCalled();
		});

		it('should deny all routes after clear', () => {
			(service as unknown as PermissionsServiceTestAccess)._capabilities.set(mockCapabilities);
			(service as unknown as PermissionsServiceTestAccess)._loaded.set(true);
			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(true);

			service.clear();

			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(false);
		});
	});
	// #endregion
});
// #endregion
