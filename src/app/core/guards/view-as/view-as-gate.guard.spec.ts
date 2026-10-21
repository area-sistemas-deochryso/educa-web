// * Tests for viewAsGateGuard (P92 F2, P115 F3) — blocks a user who holds the "ver como" capability
// * from entering estudiante/*|profesor/* without an active selection matching that module.
// * The decision is the capability, never the role name. No-op for everyone else.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { viewAsGateGuard } from './view-as-gate.guard';
import { AuthService } from '@core/services/auth';
import { UserPermissionsService } from '@core/services/permissions';
import { VIEW_AS_CAPABILITY, ViewAsContextService } from '@core/services/view-as';

// #endregion

// #region Helpers
function buildRoute(data: Record<string, unknown>): ActivatedRouteSnapshot {
	return { data } as ActivatedRouteSnapshot;
}
// #endregion

// #region Tests
describe('viewAsGateGuard', () => {
	let authServiceMock: Partial<AuthService>;
	let viewAsContextMock: Partial<ViewAsContextService>;
	let permissionsMock: { ensurePermisosLoaded: ReturnType<typeof vi.fn>; hasOwnCapability: ReturnType<typeof vi.fn> };

	const run = (route: ActivatedRouteSnapshot, url: string) =>
		TestBed.runInInjectionContext(() => viewAsGateGuard(route, { url } as RouterStateSnapshot));

	beforeEach(() => {
		authServiceMock = { currentUser: { rol: 'Director', nombreCompleto: 'Dir', entityId: 1, sedeId: 1 } };
		viewAsContextMock = { hasContextForRol: vi.fn().mockReturnValue(false) };
		permissionsMock = {
			ensurePermisosLoaded: vi.fn().mockResolvedValue(true),
			hasOwnCapability: vi.fn((code: string) => code === VIEW_AS_CAPABILITY),
		};

		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: AuthService, useValue: authServiceMock },
				{ provide: ViewAsContextService, useValue: viewAsContextMock },
				{ provide: UserPermissionsService, useValue: permissionsMock },
			],
		});
	});

	it('lets a real profesor through inside their own module without checking context', async () => {
		authServiceMock.currentUser = { rol: 'Profesor', nombreCompleto: 'Prof', entityId: 1, sedeId: 1 };

		const result = await run(buildRoute({ viewAsRol: 'Profesor' }), '/intranet/profesor/cursos');

		expect(result).toBe(true);
		expect(viewAsContextMock.hasContextForRol).not.toHaveBeenCalled();
	});

	it('lets a user without the "ver como" capability through (route permissions and the backend decide)', async () => {
		permissionsMock.hasOwnCapability.mockReturnValue(false);

		const result = await run(buildRoute({ viewAsRol: 'Profesor' }), '/intranet/profesor/cursos');

		expect(result).toBe(true);
		expect(viewAsContextMock.hasContextForRol).not.toHaveBeenCalled();
	});

	it('does not depend on the role name: Administrador without the capability is not gated', async () => {
		authServiceMock.currentUser = { rol: 'Administrador', nombreCompleto: 'Admin', entityId: 1, sedeId: 1 };
		permissionsMock.hasOwnCapability.mockReturnValue(false);

		const result = await run(buildRoute({ viewAsRol: 'Profesor' }), '/intranet/profesor/cursos');

		expect(result).toBe(true);
	});

	it.each(['Administrador', 'Director', 'Promotor', 'Coordinador Académico', 'Asistente Administrativo'])(
		'gates %s when they hold the capability and have no context',
		async (rol) => {
			authServiceMock.currentUser = { rol, nombreCompleto: 'X', entityId: 1, sedeId: 1 } as never;

			const result = await run(buildRoute({ viewAsRol: 'Profesor' }), '/intranet/profesor/cursos');

			expect(result).toBeInstanceOf(UrlTree);
		},
	);

	it('waits for permissions to load before deciding', async () => {
		await run(buildRoute({ viewAsRol: 'Profesor' }), '/intranet/profesor/cursos');

		expect(permissionsMock.ensurePermisosLoaded).toHaveBeenCalled();
	});

	it('lets a user with the capability through when a matching context is already active', async () => {
		(viewAsContextMock.hasContextForRol as ReturnType<typeof vi.fn>).mockReturnValue(true);

		const result = await run(buildRoute({ viewAsRol: 'Profesor' }), '/intranet/profesor/cursos');

		expect(result).toBe(true);
	});

	it('redirects to the gate preserving returnUrl', async () => {
		const result = await run(buildRoute({ viewAsRol: 'Estudiante' }), '/intranet/estudiante/horarios');

		expect(result).toBeInstanceOf(UrlTree);
		const tree = result as UrlTree;
		expect(tree.toString()).toContain('/intranet/ver-como/estudiante');
		expect(tree.queryParams['returnUrl']).toBe('/intranet/estudiante/horarios');
	});

	it('passes through when the route has no viewAsRol data', async () => {
		const result = await run(buildRoute({}), '/intranet');

		expect(result).toBe(true);
		expect(permissionsMock.ensurePermisosLoaded).not.toHaveBeenCalled();
	});
});
// #endregion
