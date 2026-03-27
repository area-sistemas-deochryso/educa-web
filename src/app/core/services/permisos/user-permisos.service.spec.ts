// * Tests for UserPermisosService — validates tienePermiso, ensurePermisosLoaded, and state lifecycle.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';

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

const mockPermisosPersonalizados: PermisosUsuarioResultado = {
	usuarioId: 1,
	rol: 'Profesor',
	vistasPermitidas: ['intranet/profesor/horarios', 'intranet/admin/salones'],
	tienePermisosPersonalizados: true,
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
			expect(service.loadFailed()).toBe(false);
		});

		it('should have empty vistas', () => {
			expect(service.vistasPermitidas()).toEqual([]);
		});

		it('should not have personalized permisos', () => {
			expect(service.tienePermisosPersonalizados()).toBe(false);
		});
	});
	// #endregion

	// #region tienePermiso — core authorization logic
	describe('tienePermiso', () => {
		beforeEach(() => {
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

		it('should NOT grant access to sub-routes (granular check)', () => {
			expect(service.tienePermiso('intranet/admin')).toBe(false);
		});

		it('should NOT grant access to parent routes', () => {
			expect(service.tienePermiso('intranet')).toBe(false);
		});

		it('should NOT grant partial path matches', () => {
			// "intranet/admin/usuarios-admin" should NOT match "intranet/admin/usuarios"
			expect(service.tienePermiso('intranet/admin/usuarios-admin')).toBe(false);
		});
	});
	// #endregion

	// #region tienePermiso edge cases
	describe('tienePermiso edge cases', () => {
		it('should deny when not loaded', () => {
			expect(service.tienePermiso('intranet/admin/usuarios')).toBe(false);
		});

		it('should allow all when loaded with empty vistas (no permissions configured)', () => {
			(service as any)._permisos.set({ ...mockPermisos, vistasPermitidas: [] });
			(service as any)._loaded.set(true);

			expect(service.tienePermiso('any/route')).toBe(true);
		});

		it('should handle empty string route', () => {
			(service as any)._permisos.set(mockPermisos);
			(service as any)._loaded.set(true);

			expect(service.tienePermiso('')).toBe(false);
		});

		it('should handle route with only slashes', () => {
			(service as any)._permisos.set(mockPermisos);
			(service as any)._loaded.set(true);

			expect(service.tienePermiso('/')).toBe(false);
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

		it('should return true immediately when already loaded', async () => {
			mocks.authService.isAuthenticated = true;
			(service as any)._loaded.set(true);
			(service as any)._permisos.set(mockPermisos);

			const result = await service.ensurePermisosLoaded();

			expect(result).toBe(true);
			expect(mocks.permisosService.getMisPermisos).not.toHaveBeenCalled();
		});

		it('should fetch from API and return true on success', async () => {
			mocks.authService.isAuthenticated = true;

			const result = await service.ensurePermisosLoaded();

			expect(result).toBe(true);
			expect(mocks.permisosService.getMisPermisos).toHaveBeenCalled();
			expect(service.permisos()).toEqual(mockPermisos);
			expect(service.loaded()).toBe(true);
		});

		it('should save to storage after successful fetch', async () => {
			mocks.authService.isAuthenticated = true;

			await service.ensurePermisosLoaded();

			expect(mocks.storageService.setPermisos).toHaveBeenCalledWith(mockPermisos);
		});

		it('should return false and set loadFailed on API error', async () => {
			mocks.authService.isAuthenticated = true;
			mocks.permisosService.getMisPermisos = vi.fn().mockReturnValue(
				throwError(() => new Error('Network error')),
			);

			const result = await service.ensurePermisosLoaded();

			expect(result).toBe(false);
			expect(service.loadFailed()).toBe(true);
			expect(service.loading()).toBe(false);
		});

		it('should return false immediately if already failed', async () => {
			mocks.authService.isAuthenticated = true;
			(service as any)._loadFailed.set(true);

			const result = await service.ensurePermisosLoaded();

			expect(result).toBe(false);
			expect(mocks.permisosService.getMisPermisos).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region Storage restore
	describe('storage restore', () => {
		it('should restore permisos from storage on init', () => {
			mocks.storageService.getPermisos.mockReturnValue(mockPermisos);

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

		it('should remain unloaded when storage returns null', () => {
			mocks.storageService.getPermisos.mockReturnValue(null);

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

			expect(freshService.permisos()).toBeNull();
			expect(freshService.loaded()).toBe(false);
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
			expect(service.loading()).toBe(false);
			expect(service.loadFailed()).toBe(false);
			expect(mocks.storageService.clearPermisos).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region computed signals
	describe('computed signals', () => {
		it('should derive vistasPermitidas from permisos', () => {
			(service as any)._permisos.set(mockPermisos);
			expect(service.vistasPermitidas()).toEqual(mockPermisos.vistasPermitidas);
		});

		it('should derive tienePermisosPersonalizados', () => {
			(service as any)._permisos.set(mockPermisosPersonalizados);
			expect(service.tienePermisosPersonalizados()).toBe(true);
		});

		it('should return empty array when permisos is null', () => {
			(service as any)._permisos.set(null);
			expect(service.vistasPermitidas()).toEqual([]);
		});

		it('should return false for personalizados when permisos is null', () => {
			(service as any)._permisos.set(null);
			expect(service.tienePermisosPersonalizados()).toBe(false);
		});
	});
	// #endregion
});
// #endregion
