// * Tests for UserPermisosService — validates tienePermiso authorization logic.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { DestroyRef } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject } from 'rxjs';

import { UserPermisosService } from './user-permisos.service';
import { AuthService } from '../auth';
import { StorageService } from '../storage';
import { PermisosService } from './permisos.service';
import { PermisosUsuarioResultado } from './permisos.models';

// #endregion

// #region Mocks
const mockPermisos: PermisosUsuarioResultado = {
	usuarioId: 1,
	rol: 'Director',
	vistasPermitidas: [
		'intranet/admin/usuarios',
		'intranet/admin/cursos',
		'intranet/profesor/horarios',
	],
	tienePermisosPersonalizados: false,
};

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
			getMisPermisos: vi.fn().mockReturnValue(of(mockPermisos)),
		},
	};
}
// #endregion

// #region Tests
describe('UserPermisosService', () => {
	let service: UserPermisosService;
	let mocks: ReturnType<typeof createMocks>;

	beforeEach(() => {
		mocks = createMocks();

		TestBed.configureTestingModule({
			providers: [
				UserPermisosService,
				{ provide: AuthService, useValue: mocks.authService },
				{ provide: StorageService, useValue: mocks.storageService },
				{ provide: PermisosService, useValue: mocks.permisosService },
			],
		});

		service = TestBed.inject(UserPermisosService);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should start without permisos', () => {
			expect(service.permisos()).toBeNull();
			expect(service.loaded()).toBe(false);
			expect(service.loading()).toBe(false);
		});

		it('should have empty vistas', () => {
			expect(service.vistasPermitidas()).toEqual([]);
		});
	});
	// #endregion

	// #region tienePermiso — the core authorization logic
	describe('tienePermiso', () => {
		beforeEach(() => {
			// Simulate loaded state with permisos
			(service as any)._permisos.set(mockPermisos);
			(service as any)._loaded.set(true);
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

		it('should NOT grant access to sub-routes', () => {
			expect(service.tienePermiso('intranet/admin')).toBe(false);
		});

		it('should NOT grant access to parent routes', () => {
			expect(service.tienePermiso('intranet')).toBe(false);
		});
	});
	// #endregion

	// #region tienePermiso edge cases
	describe('tienePermiso edge cases', () => {
		it('should deny when not loaded', () => {
			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(false);
		});

		it('should allow all when loaded with empty vistas', () => {
			(service as any)._permisos.set({
				...mockPermisos,
				vistasPermitidas: [],
			});
			(service as any)._loaded.set(true);

			expect(service.tienePermiso('any/route')).toBe(true);
		});
	});
	// #endregion

	// #region Storage restore
	describe('storage restore', () => {
		it('should restore permisos from storage on init', () => {
			mocks.storageService.getPermisos.mockReturnValue(mockPermisos);

			// Recreate service to trigger constructor
			TestBed.resetTestingModule();
			TestBed.configureTestingModule({
				providers: [
					UserPermisosService,
					{ provide: AuthService, useValue: mocks.authService },
					{ provide: StorageService, useValue: mocks.storageService },
					{ provide: PermisosService, useValue: mocks.permisosService },
				],
			});

			const freshService = TestBed.inject(UserPermisosService);

			expect(freshService.permisos()).toEqual(mockPermisos);
			expect(freshService.loaded()).toBe(true);
		});
	});
	// #endregion

	// #region clear
	describe('clear', () => {
		it('should reset state and clear storage', () => {
			(service as any)._permisos.set(mockPermisos);
			(service as any)._loaded.set(true);

			service.clear();

			expect(service.permisos()).toBeNull();
			expect(service.loaded()).toBe(false);
			expect(mocks.storageService.clearPermisos).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region computed
	describe('computed signals', () => {
		it('should derive vistasPermitidas', () => {
			(service as any)._permisos.set(mockPermisos);
			expect(service.vistasPermitidas()).toEqual(mockPermisos.vistasPermitidas);
		});

		it('should derive tienePermisosPersonalizados', () => {
			(service as any)._permisos.set({ ...mockPermisos, tienePermisosPersonalizados: true });
			expect(service.tienePermisosPersonalizados()).toBe(true);
		});
	});
	// #endregion
});
// #endregion
