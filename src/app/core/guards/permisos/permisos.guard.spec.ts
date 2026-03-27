// * Tests for permisosGuard — validates permission checks, path building, and redirect behavior.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, UrlSegment, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { permisosGuard } from './permisos.guard';
import { AuthService, ErrorHandlerService, UserPermisosService } from '@core/services';

// #endregion

// #region Helpers

/** Build a minimal ActivatedRouteSnapshot chain for testing getFullPath. */
function buildRouteChain(...segments: string[][]): ActivatedRouteSnapshot {
	let parent: ActivatedRouteSnapshot | null = null;

	for (const segPaths of segments) {
		const route = {
			url: segPaths.map((p) => ({ path: p }) as UrlSegment),
			parent,
		} as ActivatedRouteSnapshot;
		parent = route;
	}

	return parent!;
}

// #endregion

// #region Tests
describe('permisosGuard', () => {
	let authServiceMock: Partial<AuthService>;
	let userPermisosMock: Partial<UserPermisosService>;
	let errorHandlerMock: Partial<ErrorHandlerService>;

	beforeEach(() => {
		authServiceMock = { isAuthenticated: true, logout: vi.fn() };
		userPermisosMock = {
			ensurePermisosLoaded: vi.fn().mockResolvedValue(true),
			tienePermiso: vi.fn().mockReturnValue(true),
		};
		errorHandlerMock = { showWarning: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: AuthService, useValue: authServiceMock },
				{ provide: UserPermisosService, useValue: userPermisosMock },
				{ provide: ErrorHandlerService, useValue: errorHandlerMock },
			],
		});
	});

	// #region Not authenticated — pass through
	describe('not authenticated', () => {
		it('should return true and let authGuard handle it', async () => {
			authServiceMock.isAuthenticated = false;
			const route = buildRouteChain(['intranet'], ['admin']);

			const result = await TestBed.runInInjectionContext(() => permisosGuard(route, {} as any));

			expect(result).toBe(true);
			expect(userPermisosMock.ensurePermisosLoaded).not.toHaveBeenCalled();
		});
	});
	// #endregion

	// #region Permissions loaded — access granted
	describe('access granted', () => {
		it('should return true when user has permission for the route', async () => {
			(userPermisosMock.tienePermiso as any).mockReturnValue(true);
			const route = buildRouteChain(['intranet'], ['admin'], ['usuarios']);

			const result = await TestBed.runInInjectionContext(() => permisosGuard(route, {} as any));

			expect(result).toBe(true);
			expect(userPermisosMock.tienePermiso).toHaveBeenCalledWith('intranet/admin/usuarios');
		});
	});
	// #endregion

	// #region Permissions loaded — access denied
	describe('access denied', () => {
		it('should redirect to /intranet and show warning', async () => {
			(userPermisosMock.tienePermiso as any).mockReturnValue(false);
			const route = buildRouteChain(['intranet'], ['admin'], ['salones']);

			const result = await TestBed.runInInjectionContext(() => permisosGuard(route, {} as any));

			expect(result).toBeInstanceOf(UrlTree);
			expect((result as UrlTree).toString()).toBe('/intranet');
			expect(errorHandlerMock.showWarning).toHaveBeenCalled();
		});
	});
	// #endregion

	// #region Permissions fail to load — force logout
	describe('permissions fail to load', () => {
		it('should logout and redirect to login when ensurePermisosLoaded returns false', async () => {
			(userPermisosMock.ensurePermisosLoaded as any).mockResolvedValue(false);
			const route = buildRouteChain(['intranet'], ['admin']);

			const result = await TestBed.runInInjectionContext(() => permisosGuard(route, {} as any));

			expect(authServiceMock.logout).toHaveBeenCalled();
			expect(result).toBeInstanceOf(UrlTree);
			expect((result as UrlTree).toString()).toBe('/intranet/login');
		});
	});
	// #endregion

	// #region Full path building
	describe('full path building', () => {
		it('should build path from nested route segments', async () => {
			const route = buildRouteChain(['intranet'], ['profesor'], ['horarios']);

			await TestBed.runInInjectionContext(() => permisosGuard(route, {} as any));

			expect(userPermisosMock.tienePermiso).toHaveBeenCalledWith('intranet/profesor/horarios');
		});

		it('should handle single segment routes', async () => {
			const route = buildRouteChain(['intranet']);

			await TestBed.runInInjectionContext(() => permisosGuard(route, {} as any));

			expect(userPermisosMock.tienePermiso).toHaveBeenCalledWith('intranet');
		});

		it('should skip empty url segments in route chain', async () => {
			const route = buildRouteChain([], ['intranet'], [], ['admin']);

			await TestBed.runInInjectionContext(() => permisosGuard(route, {} as any));

			expect(userPermisosMock.tienePermiso).toHaveBeenCalledWith('intranet/admin');
		});
	});
	// #endregion
});
// #endregion
