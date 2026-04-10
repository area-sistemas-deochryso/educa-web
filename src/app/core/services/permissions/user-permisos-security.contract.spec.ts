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
import { PermisosUsuarioResultado } from './permisos.models';

// #endregion

// #region Mocks
const mockPermisos: PermisosUsuarioResultado = {
	usuarioId: 1,
	rol: 'Director',
	vistasPermitidas: ['intranet/admin/usuarios', 'intranet/admin/cursos'],
	tienePermisosPersonalizados: false,
};

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
			getMisPermisos: vi.fn().mockReturnValue(of(mockPermisos)),
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

	// #region INV-S03: Custom permisos replace role permisos entirely
	describe('INV-S03: Custom permissions REPLACE role permissions (not additive)', () => {
		it('should report tienePermisosPersonalizados correctly', () => {
			(service as any)._permisos.set({
				...mockPermisos,
				tienePermisosPersonalizados: true,
				vistasPermitidas: ['intranet/profesor/horarios'],
			});
			(service as any)._loaded.set(true);

			expect(service.tienePermisosPersonalizados()).toBe(true);
			// Custom permisos only include horarios — no access to admin routes
			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(false);
			expect(service.tienePermiso('intranet/profesor/horarios')).toBe(true);
		});
	});
	// #endregion

	// #region INV-S04: Exact path matching, no inheritance
	describe('INV-S04: Exact route match — no wildcard or parent inheritance', () => {
		beforeEach(() => {
			(service as any)._permisos.set(mockPermisos);
			(service as any)._loaded.set(true);
		});

		it('should deny parent route when only child is permitted', () => {
			// Has intranet/admin/usuarios but NOT intranet/admin
			expect(service.tienePermiso('intranet/admin')).toBe(false);
		});

		it('should deny child route when only parent is permitted', () => {
			(service as any)._permisos.set({
				...mockPermisos,
				vistasPermitidas: ['intranet/admin'],
			});

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

		it('should allow all when loaded with empty vistasPermitidas (backend controls access)', () => {
			(service as any)._permisos.set({ ...mockPermisos, vistasPermitidas: [] });
			(service as any)._loaded.set(true);

			expect(service.tienePermiso('any/route/whatsoever')).toBe(true);
		});
	});
	// #endregion

	// #region INV: clear() is thorough
	describe('INV: clear() stops refresh, resets signals, and clears storage', () => {
		it('should reset all state signals', () => {
			(service as any)._permisos.set(mockPermisos);
			(service as any)._loaded.set(true);

			service.clear();

			expect(service.permisos()).toBeNull();
			expect(service.loaded()).toBe(false);
			expect(service.loading()).toBe(false);
			expect(service.loadFailed()).toBe(false);
		});

		it('should clear permisos from storage', () => {
			service.clear();

			expect(mocks.storageService.clearPermisos).toHaveBeenCalled();
		});

		it('should deny all routes after clear', () => {
			(service as any)._permisos.set(mockPermisos);
			(service as any)._loaded.set(true);
			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(true);

			service.clear();

			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(false);
		});
	});
	// #endregion
});
// #endregion
