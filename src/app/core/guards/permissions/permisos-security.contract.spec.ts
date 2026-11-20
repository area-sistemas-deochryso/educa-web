// * Security contract tests for permissionsGuard.
// * Verifies invariants INV-S03 and INV-S04 from business-rules.md.
// * Complements permisos.guard.spec.ts (functional behavior).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlSegment, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { permissionsGuard } from './permisos.guard';
import { AuthService } from '@core/services/auth';
import { ErrorHandlerService } from '@core/services/error';
import { UserPermissionsService } from '@core/services/permissions';

// #endregion

// #region Helpers
function buildRouteChain(...segments: string[][]): ActivatedRouteSnapshot {
	let parent: ActivatedRouteSnapshot | null = null;
	for (const segPaths of segments) {
		const route = {
			url: segPaths.map((p) => ({ path: p }) as UrlSegment),
			parent,
		} as ActivatedRouteSnapshot;
		parent = route;
	}
	if (!parent) {
		throw new Error('buildRouteChain requires at least one segment');
	}
	return parent;
}
// #endregion

// #region Security contract tests
describe('permissionsGuard — Security Contracts', () => {
	let authServiceMock: Partial<AuthService>;
	let userPermisosMock: Partial<UserPermissionsService>;
	let errorHandlerMock: Partial<ErrorHandlerService>;

	beforeEach(() => {
		authServiceMock = { isAuthenticated: true, logout: vi.fn() };
		userPermisosMock = {
			ensurePermisosLoaded: vi.fn().mockResolvedValue(true),
			tienePermiso: vi.fn().mockReturnValue(false),
		};
		errorHandlerMock = { showWarning: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: AuthService, useValue: authServiceMock },
				{ provide: UserPermissionsService, useValue: userPermisosMock },
				{ provide: ErrorHandlerService, useValue: errorHandlerMock },
			],
		});
	});

	// #region INV-S04: No path inheritance
	describe('INV-S04: Permission to parent does NOT grant access to children', () => {
		it('should deny intranet/admin/usuarios when only intranet/admin is permitted', async () => {
			(userPermisosMock.tienePermiso as ReturnType<typeof vi.fn>).mockImplementation(
				(ruta: string) => ruta === 'intranet/admin',
			);

			const route = buildRouteChain(['intranet'], ['admin'], ['usuarios']);
			const result = await TestBed.runInInjectionContext(() => permissionsGuard(route, {} as RouterStateSnapshot));

			// tienePermiso is called with full path, not parent
			expect(userPermisosMock.tienePermiso).toHaveBeenCalledWith('intranet/admin/usuarios');
			expect(result).toBeInstanceOf(UrlTree);
		});

		it('should deny intranet/admin when only intranet is permitted', async () => {
			(userPermisosMock.tienePermiso as ReturnType<typeof vi.fn>).mockImplementation(
				(ruta: string) => ruta === 'intranet',
			);

			const route = buildRouteChain(['intranet'], ['admin']);
			const result = await TestBed.runInInjectionContext(() => permissionsGuard(route, {} as RouterStateSnapshot));

			expect(userPermisosMock.tienePermiso).toHaveBeenCalledWith('intranet/admin');
			expect(result).toBeInstanceOf(UrlTree);
		});
	});
	// #endregion

	// #region INV: A standalone leaf skips ancestors' gate, nothing else does
	describe('INV: data.standalonePermission moves the check to the leaf, never removes it', () => {
		interface Node {
			path: string[];
			data?: Record<string, unknown>;
		}

		/** Builds parent → child → … snapshots (with `firstChild`) and returns each level. */
		function buildChain(...nodes: Node[]): ActivatedRouteSnapshot[] {
			const routes = nodes.map((n) => ({
				url: n.path.map((p) => ({ path: p }) as UrlSegment),
				routeConfig: { data: n.data },
				data: n.data ?? {},
				parent: null,
				firstChild: null,
			})) as unknown as ActivatedRouteSnapshot[];
			routes.forEach((r, i) => {
				(r as { parent: unknown }).parent = routes[i - 1] ?? null;
				(r as { firstChild: unknown }).firstChild = routes[i + 1] ?? null;
			});
			return routes;
		}

		const run = (route: ActivatedRouteSnapshot) =>
			TestBed.runInInjectionContext(() => permissionsGuard(route, {} as RouterStateSnapshot));

		it('should skip the shell when the leaf is standalone', async () => {
			const [shell] = buildChain(
				{ path: ['intranet', 'admin', 'monitoreo', 'correos'], data: { permissionPath: 'intranet/admin/monitoreo' } },
				{ path: ['mailersend'], data: { permissionPath: 'intranet/admin/monitoreo/correos/mailersend', standalonePermission: true } },
			);

			expect(await run(shell)).toBe(true);
			expect(userPermisosMock.tienePermiso).not.toHaveBeenCalled();
		});

		it('should still evaluate the standalone leaf itself with its own permissionPath', async () => {
			const [, leaf] = buildChain(
				{ path: ['intranet', 'admin', 'monitoreo', 'correos'], data: { permissionPath: 'intranet/admin/monitoreo' } },
				{ path: ['mailersend'], data: { permissionPath: 'intranet/admin/monitoreo/correos/mailersend', standalonePermission: true } },
			);

			const result = await run(leaf);

			expect(userPermisosMock.tienePermiso).toHaveBeenCalledWith('intranet/admin/monitoreo/correos/mailersend');
			expect(result).toBeInstanceOf(UrlTree);
		});

		it('should keep gating the shell when the leaf is NOT standalone', async () => {
			const [shell] = buildChain(
				{ path: ['intranet', 'admin', 'monitoreo', 'correos'], data: { permissionPath: 'intranet/admin/monitoreo' } },
				{ path: ['bandeja'], data: { permissionPath: 'intranet/admin/monitoreo/correos/bandeja' } },
			);

			const result = await run(shell);

			expect(userPermisosMock.tienePermiso).toHaveBeenCalledWith('intranet/admin/monitoreo');
			expect(result).toBeInstanceOf(UrlTree);
		});

		it('should not let a standalone leaf open its sibling routes', async () => {
			const [shell] = buildChain(
				{ path: ['intranet', 'admin', 'monitoreo', 'correos'], data: { permissionPath: 'intranet/admin/monitoreo' } },
				{ path: ['blacklist'], data: { permissionPath: 'intranet/admin/monitoreo/correos/blacklist' } },
			);
			// A user holding only the MailerSend capability.
			(userPermisosMock.tienePermiso as ReturnType<typeof vi.fn>).mockImplementation(
				(ruta: string) => ruta === 'intranet/admin/monitoreo/correos/mailersend',
			);

			expect(await run(shell)).toBeInstanceOf(UrlTree);
		});
	});
	// #endregion

	// #region INV: Permissions load failure forces logout
	describe('INV: Permission load failure forces full logout (not just redirect)', () => {
		it('should call authService.logout() when ensurePermisosLoaded fails', async () => {
			(userPermisosMock.ensurePermisosLoaded as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			const route = buildRouteChain(['intranet'], ['admin']);
			const result = await TestBed.runInInjectionContext(() => permissionsGuard(route, {} as RouterStateSnapshot));

			expect(authServiceMock.logout).toHaveBeenCalled();
			expect(result).toBeInstanceOf(UrlTree);
			expect((result as UrlTree).toString()).toBe('/intranet/login');
		});
	});
	// #endregion

	// #region INV: Guard always loads permisos before checking
	describe('INV: Guard always ensures permisos loaded before authorization', () => {
		it('should call ensurePermisosLoaded before tienePermiso', async () => {
			const callOrder: string[] = [];
			(userPermisosMock.ensurePermisosLoaded as ReturnType<typeof vi.fn>).mockImplementation(async () => {
				callOrder.push('ensureLoaded');
				return true;
			});
			(userPermisosMock.tienePermiso as ReturnType<typeof vi.fn>).mockImplementation(() => {
				callOrder.push('tienePermiso');
				return true;
			});

			const route = buildRouteChain(['intranet'], ['admin']);
			await TestBed.runInInjectionContext(() => permissionsGuard(route, {} as RouterStateSnapshot));

			expect(callOrder[0]).toBe('ensureLoaded');
			expect(callOrder[1]).toBe('tienePermiso');
		});
	});
	// #endregion
});
// #endregion
