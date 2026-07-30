// * Tests for viewAsGateGuard (P92 F2) — blocks an Administrador from
// * entering estudiante/*|profesor/* without an active "ver como" selection
// * matching that module. No-op for real profesores/estudiantes.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { viewAsGateGuard } from './view-as-gate.guard';
import { AuthService } from '@core/services/auth';
import { ViewAsContextService } from '@core/services/view-as';

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

	beforeEach(() => {
		authServiceMock = { currentUser: { rol: 'Administrador', nombreCompleto: 'Admin', entityId: 1, sedeId: 1 } };
		viewAsContextMock = { hasContextForRol: vi.fn().mockReturnValue(false) };

		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: AuthService, useValue: authServiceMock },
				{ provide: ViewAsContextService, useValue: viewAsContextMock },
			],
		});
	});

	it('lets non-admin users through without checking context', async () => {
		authServiceMock.currentUser = { rol: 'Profesor', nombreCompleto: 'Prof', entityId: 1, sedeId: 1 };
		const route = buildRoute({ viewAsRol: 'Profesor' });

		const result = await TestBed.runInInjectionContext(() =>
			viewAsGateGuard(route, { url: '/intranet/profesor/cursos' } as RouterStateSnapshot),
		);

		expect(result).toBe(true);
		expect(viewAsContextMock.hasContextForRol).not.toHaveBeenCalled();
	});

	it('lets an admin through when a matching context is already active', async () => {
		(viewAsContextMock.hasContextForRol as ReturnType<typeof vi.fn>).mockReturnValue(true);
		const route = buildRoute({ viewAsRol: 'Profesor' });

		const result = await TestBed.runInInjectionContext(() =>
			viewAsGateGuard(route, { url: '/intranet/profesor/cursos' } as RouterStateSnapshot),
		);

		expect(result).toBe(true);
	});

	it('redirects an admin without a matching context to the gate, preserving returnUrl', async () => {
		const route = buildRoute({ viewAsRol: 'Estudiante' });

		const result = await TestBed.runInInjectionContext(() =>
			viewAsGateGuard(route, { url: '/intranet/estudiante/horarios' } as RouterStateSnapshot),
		);

		expect(result).toBeInstanceOf(UrlTree);
		const tree = result as UrlTree;
		expect(tree.toString()).toContain('/intranet/ver-como/estudiante');
		expect(tree.queryParams['returnUrl']).toBe('/intranet/estudiante/horarios');
	});

	it('passes through when the route has no viewAsRol data', async () => {
		const route = buildRoute({});

		const result = await TestBed.runInInjectionContext(() =>
			viewAsGateGuard(route, { url: '/intranet' } as RouterStateSnapshot),
		);

		expect(result).toBe(true);
	});
});
// #endregion
